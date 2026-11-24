import { pipeline } from "node:stream/promises";
import type { Request, Response } from "express";
import { fileOptions, invoiceCorrection, invoiceFilters, invoiceId, uploadFields } from "./invoice.schema.js";
import type { InvoiceService } from "./invoice.service.js";

export function createInvoiceController(invoices: InvoiceService, maxBytes: number) {
  return {
    async upload(request: Request, response: Response) {
      const fields = uploadFields.safeParse(request.body);
      if (!fields.success || !request.file) {
        response.status(400).json({ error: "Select a supplier and provide one invoice file." });
        return;
      }
      if (request.file.size > maxBytes) {
        response.status(413).json({ error: "The invoice file exceeds the upload size limit." });
        return;
      }

      const result = await invoices.upload(fields.data.supplierId, response.locals.user.id, request.file);
      if (result.outcome === "unsupported") {
        response.status(415).json({ error: "Upload a PDF, PNG, or JPEG file." });
      } else if (result.outcome === "missing-supplier") {
        response.status(404).json({ error: "Supplier not found." });
      } else {
        response.status(201).json(result.invoice);
      }
    },

    async list(request: Request, response: Response) {
      const filters = invoiceFilters.safeParse(request.query);
      if (!filters.success) {
        response.status(400).json({ error: "Enter valid invoice filters and pagination." });
        return;
      }
      response.json(await invoices.list(filters.data));
    },

    async detail(request: Request<{ id: string }>, response: Response) {
      const id = invoiceId.safeParse(request.params.id);
      const invoice = id.success && await invoices.detail(id.data);
      if (!invoice) {
        response.status(404).json({ error: "Invoice not found." });
        return;
      }
      response.json(invoice);
    },

    async retry(request: Request<{ id: string }>, response: Response) {
      const id = invoiceId.safeParse(request.params.id);
      if (!id.success) { response.status(404).json({ error: "Invoice not found." }); return; }
      const result = await invoices.retry(id.data);
      if (result.outcome === "missing") response.status(404).json({ error: "Invoice not found." });
      else if (result.outcome === "conflict") response.status(409).json({ error: "This invoice cannot be extracted again in its current state." });
      else response.json(await invoices.detail(id.data));
    },

    async save(request: Request<{ id: string }>, response: Response) {
      const id = invoiceId.safeParse(request.params.id);
      const body = invoiceCorrection.safeParse(request.body);
      if (!id.success) { response.status(404).json({ error: "Invoice not found." }); return; }
      if (!body.success) { response.status(400).json({ error: "Check the invoice fields and decimal formats." }); return; }
      const result = await invoices.save(id.data, body.data);
      if (result.outcome === "missing") response.status(404).json({ error: "Invoice not found." });
      else if (result.outcome === "conflict") response.status(409).json({ error: "Only invoices needing review can be edited." });
      else response.json(result.invoice);
    },

    async file(request: Request<{ id: string }>, response: Response) {
      const id = invoiceId.safeParse(request.params.id);
      const options = fileOptions.safeParse(request.query);
      if (!options.success) {
        response.status(400).json({ error: "Invalid invoice file options." });
        return;
      }
      const file = id.success && await invoices.file(id.data);
      if (!file) {
        response.status(404).json({ error: "Invoice file not found." });
        return;
      }

      response.attachment(file.fileName);
      if (!options.data.download) {
        const disposition = response.getHeader("Content-Disposition") as string;
        response.set("Content-Disposition", disposition.replace(/^attachment/, "inline"));
      }
      response.set({
        "Content-Type": file.mimeType,
        "Content-Length": String(file.size),
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox; default-src 'none'",
        "Referrer-Policy": "no-referrer",
      });
      if (request.method === "HEAD") {
        file.stream.destroy();
        response.end();
        return;
      }
      await pipeline(file.stream, response);
    },
  };
}
