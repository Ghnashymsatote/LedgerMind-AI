import { Prisma, type PrismaClient } from "@ledgermind/database";
import type { SupplierInput, SupplierUpdate } from "./supplier.schema.js";

export function createSupplierService(db: PrismaClient) {
  return {
    list() {
      return db.supplier.findMany({ orderBy: [{ name: "asc" }, { id: "asc" }] });
    },

    findById(id: string) {
      return db.supplier.findUnique({ where: { id } });
    },

    create(data: SupplierInput) {
      return db.supplier.create({ data });
    },

    async update(id: string, data: SupplierUpdate) {
      try {
        return await db.supplier.update({ where: { id }, data });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2025") throw error;
        return null;
      }
    },
  };
}

export type SupplierService = ReturnType<typeof createSupplierService>;
