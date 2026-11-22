import { expect, test } from "vitest";
import { hashPassword, verifyPassword } from "../src/lib/password.js";

test("password hashes use independent salts and verify only the original password", async () => {
  const password = "example-password-for-test";
  const [first, second] = await Promise.all([hashPassword(password), hashPassword(password)]);
  expect(first).not.toBe(second);
  expect(first).not.toContain(password);
  await expect(verifyPassword(password, first)).resolves.toBe(true);
  await expect(verifyPassword("wrong-password", first)).resolves.toBe(false);
  await expect(verifyPassword(password, "malformed")).resolves.toBe(false);
});
