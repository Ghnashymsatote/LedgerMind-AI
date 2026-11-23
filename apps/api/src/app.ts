import type { PrismaClient } from "@ledgermind/database";
import express from "express";
import type { InvoiceStorage } from "./lib/invoice-storage.js";
import { registerInvoiceRoutes } from "./modules/invoices/invoice.routes.js";
import { createInvoiceService } from "./modules/invoices/invoice.service.js";
import { createRequireSession } from "./middleware/authentication.js";
import { handleError } from "./middleware/error-handler.js";
import { checkOrigin } from "./middleware/origin.js";
import { registerAuthRoutes } from "./modules/auth/auth.routes.js";
import { createAuthService } from "./modules/auth/auth.service.js";
import { registerSupplierRoutes } from "./modules/suppliers/supplier.routes.js";
import { createSupplierService } from "./modules/suppliers/supplier.service.js";

interface BusinessDependencies {
  db: PrismaClient;
  origin: string;
  invoices?: { storage: InvoiceStorage; maxBytes: number };
}

export function createApp(checkDatabase: () => Promise<unknown>, business?: BusinessDependencies) {
  const app = express();

  app.disable("x-powered-by");

  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.get("/ready", async (_request, response) => {
    try {
      await checkDatabase();
      response.json({ status: "ready" });
    } catch {
      response.status(503).json({ status: "unavailable" });
    }
  });

  if (!business) {
    return app;
  }

  const { db, origin, invoices } = business;
  const router = express.Router();

  const authService = createAuthService(db);
  const supplierService = createSupplierService(db);
  const requireSession = createRequireSession(authService);
  const protectOrigin = checkOrigin(origin);
  const parseJson = express.json({ limit: "8kb" });

  router.use(["/auth", "/suppliers"], protectOrigin, parseJson);

  registerAuthRoutes(router, authService, requireSession, origin);
  registerSupplierRoutes(router, supplierService, requireSession);

  if (invoices) {
    const invoiceService = createInvoiceService(db, invoices.storage);

    router.use("/invoices", protectOrigin);
    registerInvoiceRoutes(router, invoiceService, requireSession, invoices.maxBytes);
  }

  router.use(handleError);
  app.use(router);

  return app;
}
