import { createHash, randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import type { Server } from "node:http";
import { PrismaClient } from "@ledgermind/database";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createApp } from "../src/app.js";
import { hashPassword } from "../src/lib/password.js";

describe.skipIf(process.env.RUN_DB_TESTS !== "1")("authentication and suppliers with PostgreSQL", () => {
  const origin = "http://127.0.0.1:3000";
  const id = randomUUID();
  const adminEmail = `admin-${id}@example.test`;
  const operatorEmail = `operator-${id}@example.test`;
  const supplierName = `Supplier test ${id}`;
  const password = randomBytes(24).toString("base64url");
  let db: PrismaClient;
  let server: Server;
  let base: string;

  beforeAll(async () => {
    db = new PrismaClient();
    const passwordHash = await hashPassword(password);
    await db.user.createMany({
      data: [
        { email: adminEmail, role: "ADMIN", passwordHash },
        { email: operatorEmail, role: "OPERATOR", passwordHash },
      ],
    });
    server = createApp(() => db.$queryRaw`SELECT 1`, { db, origin }).listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected a TCP address");
    base = `http://127.0.0.1:${address.port}`;
  }, 15_000);

  afterAll(async () => {
    try {
      if (server) await new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    } finally {
      if (db) {
        try {
          await db.$transaction([
            db.supplier.deleteMany({ where: { name: supplierName } }),
            db.user.deleteMany({ where: { email: { in: [adminEmail, operatorEmail] } } }),
          ]);
        } finally {
          await db.$disconnect();
        }
      }
    }
  });

  function request(path: string, method = "GET", data?: unknown, cookie?: string, requestOrigin = origin) {
    const headers = new Headers({ origin: requestOrigin });
    if (data !== undefined) headers.set("Content-Type", "application/json");
    if (cookie) headers.set("Cookie", cookie);
    return fetch(base + path, { method, headers, body: data === undefined ? undefined : JSON.stringify(data) });
  }

  async function authenticate(email: string, existing?: string) {
    const response = await request("/auth/login", "POST", { email, password }, existing);
    expect(response.status).toBe(200);
    const header = response.headers.get("set-cookie") ?? "";
    expect(header).toMatch(/HttpOnly/i);
    expect(header).toMatch(/SameSite=Lax/i);
    expect(header).toMatch(/Max-Age=28800/i);
    const cookie = header.split(";")[0];
    return { cookie, user: await response.json() };
  }

  test("rejects anonymous requests, wrong credentials, and cross-origin login", async () => {
    expect((await request("/auth/me")).status).toBe(401);
    expect((await request("/suppliers")).status).toBe(401);
    const wrong = await request("/auth/login", "POST", { email: adminEmail, password: "incorrect" });
    const unknown = await request("/auth/login", "POST", { email: "unknown@example.test", password });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(await wrong.json()).toEqual(await unknown.json());
    expect((await request("/auth/login", "POST", { email: adminEmail, password }, undefined, "https://example.test")).status).toBe(403);
  });

  test("normalizes login email, stores a session digest, rotates sessions, and revokes logout", async () => {
    const first = await authenticate(adminEmail.toUpperCase());
    expect(first.user).toEqual({ id: expect.any(String), email: adminEmail, role: "ADMIN" });
    const token = first.cookie.split("=")[1];
    const tokenHash = createHash("sha256").update(token).digest("hex");
    expect(await db.session.findUnique({ where: { tokenHash } })).not.toBeNull();
    expect(await db.session.findUnique({ where: { tokenHash: token } })).toBeNull();
    const current = await request("/auth/me", "GET", undefined, first.cookie);
    expect(current.headers.get("cache-control")).toBe("no-store");
    expect(await current.json()).toEqual(first.user);

    const second = await authenticate(adminEmail, first.cookie);
    expect(second.cookie).not.toBe(first.cookie);
    expect((await request("/auth/me", "GET", undefined, first.cookie)).status).toBe(401);
    const logout = await request("/auth/logout", "POST", undefined, second.cookie);
    expect(logout.status).toBe(204);
    expect(logout.headers.get("set-cookie")).toMatch(/ledgermind_session=;/);
    expect((await request("/auth/me", "GET", undefined, second.cookie)).status).toBe(401);
  });

  test("rejects expired sessions", async () => {
    const { cookie } = await authenticate(operatorEmail);
    const tokenHash = createHash("sha256").update(cookie.split("=")[1]).digest("hex");
    await db.session.update({ where: { tokenHash }, data: { expiresAt: new Date(0) } });
    expect((await request("/auth/me", "GET", undefined, cookie)).status).toBe(401);
  });

  test("lets admins create and update suppliers while operators can only read", async () => {
    const admin = await authenticate(adminEmail);
    const operator = await authenticate(operatorEmail);
    const payload = { name: supplierName, taxId: "TEST-001", tallyLedgerName: "Test ledger" };
    expect((await request("/suppliers", "POST", payload)).status).toBe(401);
    expect((await request("/suppliers", "POST", payload, operator.cookie)).status).toBe(403);
    expect((await request("/suppliers", "POST", payload, admin.cookie, "https://example.test")).status).toBe(403);
    expect((await request("/suppliers", "POST", { ...payload, tallyLedgerName: " " }, admin.cookie)).status).toBe(400);

    const created = await request("/suppliers", "POST", payload, admin.cookie);
    expect(created.status).toBe(201);
    const row = await created.json();
    expect(row).toEqual({ ...payload, id: expect.any(String), status: "ACTIVE" });
    const path = `/suppliers/${row.id}`;

    const all = await request("/suppliers", "GET", undefined, operator.cookie);
    expect(all.status).toBe(200);
    expect(await all.json()).toContainEqual(row);
    const detail = await request(path, "GET", undefined, operator.cookie);
    expect(detail.status).toBe(200);
    expect(await detail.json()).toEqual(row);
    expect((await request(path, "PATCH", { status: "INACTIVE" }, operator.cookie)).status).toBe(403);
    expect((await request(path, "PATCH", { status: "INVALID" }, admin.cookie)).status).toBe(400);
    expect((await request(path, "PATCH", {}, admin.cookie)).status).toBe(400);

    const changed = await request(path, "PATCH", { status: "INACTIVE", taxId: null, tallyLedgerName: "Changed ledger" }, admin.cookie);
    expect(changed.status).toBe(200);
    expect(await changed.json()).toEqual({ ...row, status: "INACTIVE", taxId: null, tallyLedgerName: "Changed ledger" });
    const missing = `/suppliers/${randomUUID()}`;
    expect((await request(missing, "GET", undefined, operator.cookie)).status).toBe(404);
    expect((await request(missing, "PATCH", { name: supplierName }, admin.cookie)).status).toBe(404);
  }, 15_000);
});
