import type { RequestHandler } from "express";
import { readSessionHash } from "../lib/session.js";
import type { AuthService } from "../modules/auth/auth.service.js";

export function createRequireSession(auth: Pick<AuthService, "findSessionUser">): RequestHandler {
  return async (request, response, next) => {
    const user = await auth.findSessionUser(readSessionHash(request.headers.cookie));
    if (!user) {
      response.status(401).json({ error: "Sign in to continue." });
      return;
    }
    response.locals.user = user;
    next();
  };
}
