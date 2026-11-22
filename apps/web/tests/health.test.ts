import { expect, test } from "vitest";
import { GET } from "../app/api/health/route";

test("reports web liveness", async () => {
  const response = GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
});
