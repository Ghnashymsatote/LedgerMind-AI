import type { PrismaClient } from "@ledgermind/database";
import express from "express";
import { createRequireSession } from "./middleware/authentication.js";
import { handleError } from "./middleware/error-handler.js";
import { checkOrigin } from "./middleware/origin.js";
import { registerAuthRoutes } from "./modules/auth/auth.routes.js";
import { createAuthService } from "./modules/auth/auth.service.js";
import { registerSupplierRoutes } from "./modules/suppliers/supplier.routes.js";
import { createSupplierService } from "./modules/suppliers/supplier.service.js";

export function createApp(checkDatabase: () => Promise<unknown>, business?: { db: PrismaClient; origin: string }) {
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

  if (business) {
    const { db, origin } = business;
    const router = express.Router();
    const paths = ["/auth", "/suppliers"];
    const auth = createAuthService(db);
    const requireSession = createRequireSession(auth);
    router.use(paths, checkOrigin(origin), express.json({ limit: "8kb" }));
    registerAuthRoutes(router, auth, requireSession, origin);
    registerSupplierRoutes(router, createSupplierService(db), requireSession);
    router.use(handleError);
    app.use(router);
  }

  return app;
}
