import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(
  (password: string, salt: Buffer, callback: (error: Error | null, key: Buffer) => void) =>
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }, callback),
);

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt-v1:${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [, salt, digest] = /^scrypt-v1:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(encoded) ?? [];
  if (!salt || !digest) return false;
  const key = await derive(password, Buffer.from(salt, "hex"));
  return timingSafeEqual(key, Buffer.from(digest, "hex"));
}
