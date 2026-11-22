import { expect, test } from "@playwright/test";

const email = process.env.PLAYWRIGHT_ADMIN_EMAIL;
const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD;
const supplierName = process.env.PLAYWRIGHT_SUPPLIER_NAME ?? `Browser supplier ${Date.now()}`;

test("an admin signs in, maintains a supplier, and signs out", async ({ page }) => {
  test.skip(!email || !password, "Supply a dedicated admin account for the browser workflow.");
  if (!email || !password) return;
  test.setTimeout(60_000);

  await page.goto("/suppliers");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Suppliers & mappings" })).toBeVisible();

  await page.getByLabel("Supplier name").fill(supplierName);
  await page.getByLabel("Tally ledger name").fill("Browser ledger");
  await page.getByRole("button", { name: "Add supplier" }).click();
  await expect(page.getByRole("row", { name: new RegExp(supplierName) })).toContainText("Browser ledger");
  await page.getByRole("button", { name: `Edit ${supplierName}` }).click();
  await page.getByLabel("Status").selectOption("INACTIVE");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("row", { name: new RegExp(supplierName) })).toContainText("Inactive");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/suppliers");
  await expect(page).toHaveURL(/\/login$/);
});

test("an operator can view supplier records with read-only access", async ({ page }) => {
  const operatorEmail = process.env.PLAYWRIGHT_OPERATOR_EMAIL;
  const operatorPassword = process.env.PLAYWRIGHT_OPERATOR_PASSWORD;
  test.skip(!operatorEmail || !operatorPassword, "Supply a dedicated operator account.");
  if (!operatorEmail || !operatorPassword) return;
  test.setTimeout(60_000);

  await page.goto("/login");
  await page.getByLabel("Email").fill(operatorEmail);
  await page.getByLabel("Password").fill(operatorPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("View supplier records and their Tally ledger mappings.")).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add supplier" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Edit / })).toHaveCount(0);

  const identity = await page.request.get("/api/auth/me");
  expect(identity.ok()).toBe(true);
  expect(await identity.json()).toMatchObject({ email: operatorEmail, role: "OPERATOR" });

  const forbidden = await page.request.post("/api/suppliers", {
    headers: { Origin: new URL(page.url()).origin },
    data: { name: "Denied operator test supplier", tallyLedgerName: "Denied operator test ledger" },
  });
  expect(forbidden.status()).toBe(403);
  expect(await forbidden.json()).toEqual({ error: "Administrator access is required." });
});
