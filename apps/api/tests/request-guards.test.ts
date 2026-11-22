import { once } from "node:events";
import type { PrismaClient } from "@ledgermind/database";
import { expect, test } from "vitest";
import { createApp } from "../src/app.js";

test("preserves Origin, body size, and login throttling before any database call", async () => {
  const origin = "http://127.0.0.1:3000";
  const db = {} as PrismaClient;
  const server = createApp(async () => {}, { db, origin }).listen(0, "127.0.0.1");

  try {
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected a TCP address");
    const url = `http://127.0.0.1:${address.port}/auth/login`;

    function login(body: string, requestOrigin?: string) {
      const headers = new Headers({ "Content-Type": "application/json" });
      if (requestOrigin) headers.set("Origin", requestOrigin);
      return fetch(url, { method: "POST", headers, body });
    }

    const noOrigin = await login("{");
    expect(noOrigin.status).toBe(403);
    expect(noOrigin.headers.get("cache-control")).toBe("no-store");
    expect(await noOrigin.json()).toEqual({ error: "Request origin is not allowed." });

    for (const [body, status] of [["{", 400], [JSON.stringify("x".repeat(8192)), 413]] as const) {
      const response = await login(body, origin);
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ error: "Invalid request body." });
    }

    for (let attempt = 0; attempt < 30; attempt++) {
      const response = await login("{}", origin);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Enter a valid email and password." });
    }

    const throttled = await login("{}", origin);
    expect(throttled.status).toBe(429);
    expect(throttled.headers.get("ratelimit")).toBeTruthy();
    expect(await throttled.json()).toEqual({ error: "Too many login attempts. Try again in a minute." });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
