import type { Request, Response } from "express";
import { readSessionHash, sessionCookieName, sessionCookieOptions, sessionLifetime } from "../../lib/session.js";
import { login } from "./auth.schema.js";
import type { AuthService } from "./auth.service.js";

export function createAuthController(auth: AuthService, origin: string) {
  const cookie = sessionCookieOptions(origin);

  return {
    async login(request: Request, response: Response) {
      const input = login.safeParse(request.body);
      if (!input.success) {
        response.status(400).json({ error: "Enter a valid email and password." });
        return;
      }

      const session = await auth.signIn(input.data, readSessionHash(request.headers.cookie));
      if (!session) {
        response.status(401).json({ error: "Invalid email or password." });
        return;
      }

      response.cookie(sessionCookieName, session.token, { ...cookie, maxAge: sessionLifetime })
        .json(session.user);
    },

    async logout(request: Request, response: Response) {
      await auth.signOut(readSessionHash(request.headers.cookie));
      response.clearCookie(sessionCookieName, cookie).sendStatus(204);
    },

    currentUser(_request: Request, response: Response) {
      response.json(response.locals.user);
    },
  };
}
