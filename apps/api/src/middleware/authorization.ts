import type { RequestHandler } from "express";

export const requireAdmin: RequestHandler = (_request, response, next) => {
  if (response.locals.user.role !== "ADMIN") {
    response.status(403).json({ error: "Administrator access is required." });
    return;
  }
  next();
};
