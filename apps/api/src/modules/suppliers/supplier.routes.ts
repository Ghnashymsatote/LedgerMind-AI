import type { RequestHandler, Router } from "express";
import { requireAdmin } from "../../middleware/authorization.js";
import { createSupplierController } from "./supplier.controller.js";
import type { SupplierService } from "./supplier.service.js";

export function registerSupplierRoutes(router: Router, suppliers: SupplierService, requireSession: RequestHandler) {
  const controller = createSupplierController(suppliers);

  router.use("/suppliers", requireSession);
  router.get("/suppliers", controller.list);
  router.get("/suppliers/:id", controller.detail);
  router.post("/suppliers", requireAdmin, controller.create);
  router.patch("/suppliers/:id", requireAdmin, controller.update);
}
