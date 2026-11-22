import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@ledgermind/database";
import { verifyPassword } from "../../lib/password.js";
import { hashSessionToken, sessionLifetime } from "../../lib/session.js";
import type { LoginInput } from "./auth.schema.js";

const publicUser = { id: true, email: true, role: true } as const;
const dummyHash = `scrypt-v1:${"0".repeat(32)}:${"0".repeat(128)}`;

export function createAuthService(db: PrismaClient) {
  return {
    async signIn(input: LoginInput, previous: string | undefined) {
      const user = await db.user.findUnique({
        where: { email: input.email },
        select: { ...publicUser, passwordHash: true },
      });
      const matches = await verifyPassword(input.password, user?.passwordHash ?? dummyHash);
      if (!user || !matches) return null;

      const token = randomBytes(32).toString("base64url");
      const now = new Date();
      await db.$transaction([
        db.session.deleteMany({ where: { userId: user.id, expiresAt: { lte: now } } }),
        ...(previous ? [db.session.deleteMany({ where: { tokenHash: previous } })] : []),
        db.session.create({
          data: {
            tokenHash: hashSessionToken(token),
            userId: user.id,
            expiresAt: new Date(now.getTime() + sessionLifetime),
          },
        }),
      ]);
      return { token, user: { id: user.id, email: user.email, role: user.role } };
    },

    async signOut(tokenHash: string | undefined) {
      if (tokenHash) await db.session.deleteMany({ where: { tokenHash } });
    },

    async findSessionUser(tokenHash: string | undefined) {
      if (!tokenHash) return null;
      const session = await db.session.findUnique({
        where: { tokenHash, expiresAt: { gt: new Date() } },
        select: { user: { select: publicUser } },
      });
      return session?.user ?? null;
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
