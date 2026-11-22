import type { RequestHandler, Router } from "express";
import { rateLimit } from "express-rate-limit";
import { createAuthController } from "./auth.controller.js";
import type { AuthService } from "./auth.service.js";

export function registerAuthRoutes(router: Router, auth: AuthService, requireSession: RequestHandler, origin: string) {
  const controller = createAuthController(auth, origin);
  const throttle = rateLimit({
    windowMs: 60_000,
    limit: 30,
    keyGenerator: () => "login",
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many login attempts. Try again in a minute." },
  });

  router.post("/auth/login", throttle, controller.login);
  router.post("/auth/logout", controller.logout);
  router.get("/auth/me", requireSession, controller.currentUser);
}
