import { createHash } from "node:crypto";

export const sessionCookieName = "ledgermind_session";
export const sessionLifetime = 8 * 60 * 60 * 1000;

export function sessionCookieOptions(origin: string) {
  return { httpOnly: true, sameSite: "lax", secure: origin.startsWith("https:"), path: "/" } as const;
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function readSessionHash(cookie: string | undefined) {
  const entry = cookie?.split(";").map((value) => value.trim())
    .find((value) => value.startsWith(`${sessionCookieName}=`));
  const token = entry?.slice(sessionCookieName.length + 1);
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? hashSessionToken(token) : undefined;
}
