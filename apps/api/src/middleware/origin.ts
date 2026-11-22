import type { RequestHandler } from "express";

export function checkOrigin(origin: string): RequestHandler {
  return (request, response, next) => {
    response.set("Cache-Control", "no-store");
    if (!["GET", "HEAD"].includes(request.method) && request.get("origin") !== origin) {
      response.status(403).json({ error: "Request origin is not allowed." });
      return;
    }
    next();
  };
}
