import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@ledgermind/database";
import type { InvoiceStorage } from "../../lib/invoice-storage.js";
import { detectFileType, displayFileName } from "./invoice-file.js";
import type { InvoiceFilters } from "./invoice.schema.js";

const summary = {
  id: true, fileName: true, mimeType: true, sizeBytes: true, uploadedAt: true, status: true,
  supplier: { select: { id: true, name: true } },
  uploadedBy: { select: { id: true, email: true } },
} as const;

export function createInvoiceService(db: PrismaClient, storage: InvoiceStorage) {
  return {
    async upload(supplierId: string, uploadedById: string, file: { originalname: string; buffer: Buffer }) {
      const kind = detectFileType(file.buffer);
      if (!kind) return { outcome: "unsupported" } as const;

      const supplier = await db.supplier.findUnique({ where: { id: supplierId }, select: { id: true } });
      if (!supplier) return { outcome: "missing-supplier" } as const;

      const storageKey = randomUUID();
      await storage.put(storageKey, file.buffer);
      try {
        const invoice = await db.invoice.create({
          data: {
            supplierId, uploadedById, storageKey,
            fileName: displayFileName(file.originalname, kind.extension),
            mimeType: kind.mimeType,
            sizeBytes: file.buffer.length,
          },
          select: summary,
        });
        return { outcome: "created", invoice } as const;
      } catch (error) {
        // If the connection failed after commit, preserve the file referenced by the row.
        const recorded = await db.invoice.findUnique({ where: { storageKey }, select: summary }).catch(() => undefined);
        if (recorded) return { outcome: "created", invoice: recorded } as const;
        if (recorded === null) {
          await storage.remove(storageKey).catch(() => console.error("Could not remove an unrecorded invoice file."));
        } else {
          console.error("Could not confirm whether an invoice upload was recorded.");
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003" &&
            !await db.supplier.findUnique({ where: { id: supplierId }, select: { id: true } })) {
          return { outcome: "missing-supplier" } as const;
        }
        throw error;
      }
    },

    async list({ page, pageSize, search, supplierId, status }: InvoiceFilters) {
      const where: Prisma.InvoiceWhereInput = {
        supplierId,
        status,
        ...(search && {
          OR: [
            { fileName: { contains: search, mode: "insensitive" } },
            { supplier: { name: { contains: search, mode: "insensitive" } } },
          ],
        }),
      };
      const [items, total] = await db.$transaction([
        db.invoice.findMany({
          where, select: summary, orderBy: [{ uploadedAt: "desc" }, { id: "desc" }],
          skip: (page - 1) * pageSize, take: pageSize,
        }),
        db.invoice.count({ where }),
      ], { isolationLevel: "RepeatableRead" });
      return { items, total, page, pageSize };
    },

    detail(id: string) {
      return db.invoice.findUnique({ where: { id }, select: summary });
    },

    async file(id: string) {
      const invoice = await db.invoice.findUnique({
        where: { id }, select: { storageKey: true, fileName: true, mimeType: true },
      });
      if (!invoice) return null;
      const file = await storage.read(invoice.storageKey);
      return file && { ...file, fileName: invoice.fileName, mimeType: invoice.mimeType };
    },
  };
}

export type InvoiceService = ReturnType<typeof createInvoiceService>;
