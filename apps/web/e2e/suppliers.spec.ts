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
  await expect(page.getByRole("heading", { name: "Suppliers", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Add Supplier" }).click();
  const createSheet = page.getByRole("dialog", { name: "Add supplier" });
  await expect(createSheet).toBeVisible();
  await createSheet.getByLabel("Supplier name").fill(supplierName);
  await createSheet.getByLabel("Tally ledger name").fill("Browser ledger");
  await createSheet.getByRole("button", { name: "Add supplier" }).click();
  await expect(page.getByText("Supplier added successfully.")).toBeVisible();
  await expect(createSheet).toBeHidden();
  await expect(page.getByRole("row", { name: new RegExp(supplierName) })).toContainText("Browser ledger");

  await page.getByRole("button", { name: `Open actions for ${supplierName}` }).click();
  await page.getByRole("menuitem", { name: "Edit supplier" }).click();
  const editSheet = page.getByRole("dialog", { name: "Edit supplier" });
  await expect(editSheet).toBeVisible();
  await editSheet.getByRole("combobox", { name: "Status" }).click();
  await page.getByRole("option", { name: "Inactive" }).click();
  await editSheet.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Supplier updated successfully.")).toBeVisible();
  await expect(editSheet).toBeHidden();
  await expect(page.getByRole("row", { name: new RegExp(supplierName) })).toContainText("Inactive");

  await page.getByRole("button", { name: `Open account menu for ${email}` }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
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
  await expect(page.getByText("Manage supplier records and maintain the accounting ledger mappings used for invoice processing.")).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Supplier" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Open actions for / })).toHaveCount(0);

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

test("the suppliers page is responsive in light and dark themes", async ({ page }) => {
  test.skip(!email || !password, "Supply a dedicated admin account for visual supplier verification.");
  if (!email || !password) return;

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Suppliers", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Change color theme" }).click();
  await page.getByRole("menuitemradio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.getByRole("button", { name: "Change color theme" }).click();
  await page.getByRole("menuitemradio", { name: "Light" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.getByRole("button", { name: "Add Supplier" }).click();
  await expect(page.getByRole("dialog", { name: "Add supplier" })).toBeVisible();
});
