import { expect, test } from "@playwright/test";

test("the frontend renders and reports liveness", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "LedgerMind AI" })).toBeVisible();
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual({ status: "ok" });
});
