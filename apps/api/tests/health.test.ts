import { once } from "node:events";
import { expect, test } from "vitest";
import { createApp } from "../src/app.js";

test.each([true, false])("reports database readiness when reachable=%s", async (reachable) => {
  const app = createApp(async () => {
    if (!reachable) throw new Error("database unavailable");
  });
  const server = app.listen(0, "127.0.0.1");

  try {
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected a TCP address");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const health = await fetch(`${baseUrl}/health`);
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: "ok" });

    const readiness = await fetch(`${baseUrl}/ready`);
    expect(readiness.status).toBe(reachable ? 200 : 503);
    expect(await readiness.json()).toEqual({ status: reachable ? "ready" : "unavailable" });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
