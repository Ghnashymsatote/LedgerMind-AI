import type { Request, Response } from "express";
import { supplier, supplierId, supplierUpdate } from "./supplier.schema.js";
import type { SupplierService } from "./supplier.service.js";

export function createSupplierController(suppliers: SupplierService) {
  return {
    async list(_request: Request, response: Response) {
      response.json(await suppliers.list());
    },

    async detail(request: Request<{ id: string }>, response: Response) {
      const id = supplierId.safeParse(request.params.id);
      const result = id.success && await suppliers.findById(id.data);
      if (!result) {
        response.status(404).json({ error: "Supplier not found." });
        return;
      }
      response.json(result);
    },

    async create(request: Request, response: Response) {
      const input = supplier.safeParse(request.body);
      if (!input.success) {
        response.status(400).json({ error: "Enter a valid supplier name, status, and Tally ledger name." });
        return;
      }
      response.status(201).json(await suppliers.create(input.data));
    },

    async update(request: Request<{ id: string }>, response: Response) {
      const id = supplierId.safeParse(request.params.id);
      if (!id.success) {
        response.status(404).json({ error: "Supplier not found." });
        return;
      }
      const input = supplierUpdate.safeParse(request.body);
      if (!input.success) {
        response.status(400).json({ error: "Enter valid supplier changes." });
        return;
      }

      const result = await suppliers.update(id.data, input.data);
      if (!result) {
        response.status(404).json({ error: "Supplier not found." });
        return;
      }
      response.json(result);
    },
  };
}
