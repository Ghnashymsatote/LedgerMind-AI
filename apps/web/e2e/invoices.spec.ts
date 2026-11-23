import { expect, test } from "@playwright/test";

test("an operator uploads an invoice and can find and download it", async ({ page, request }) => {
  const email = process.env.PLAYWRIGHT_OPERATOR_EMAIL;
  const password = process.env.PLAYWRIGHT_OPERATOR_PASSWORD;
  const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL;
  const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD;
  test.skip(!email || !password || !adminEmail || !adminPassword, "Supply dedicated ADMIN and OPERATOR accounts.");
  if (!email || !password || !adminEmail || !adminPassword) return;
  test.setTimeout(90_000);

  const supplierName = process.env.PLAYWRIGHT_INVOICE_SUPPLIER ?? `Invoice browser supplier ${Date.now()}`;
  const webOrigin = new URL(test.info().project.use.baseURL!).origin;
  const login = await request.post("/api/auth/login", {
    headers: { Origin: webOrigin }, data: { email: adminEmail, password: adminPassword },
  });
  expect(login.ok()).toBe(true);
  const supplier = await request.post("/api/suppliers", {
    headers: { Origin: webOrigin }, data: { name: supplierName, tallyLedgerName: "Invoice browser ledger" },
  });
  expect(supplier.status()).toBe(201);
  const { id: supplierId } = await supplier.json();

  await page.goto("/invoices/upload");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Suppliers & mappings" })).toBeVisible();
  await page.getByRole("navigation", { name: "Dashboard" }).getByRole("link", { name: "Invoices" }).click();
  await page.getByRole("link", { name: "Upload invoice" }).click();

  const fileName = `invoice-${supplierName}.png`;
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+yZ1kAAAAASUVORK5CYII=", "base64");
  const supplierSelect = page.getByRole("combobox", { name: "Supplier", exact: true });
  await supplierSelect.selectOption({ label: supplierName });
  await page.getByLabel("Invoice file").setInputFiles({ name: fileName, mimeType: "image/png", buffer: png });
  await expect(supplierSelect).toHaveValue(supplierId);
  await page.getByRole("button", { name: "Upload invoice" }).click();
  await expect(page.getByRole("heading", { name: fileName })).toBeVisible();

  const viewLink = page.getByRole("link", { name: "View file" });
  const downloadLink = page.getByRole("link", { name: "Download file" });
  const path = await viewLink.getAttribute("href");
  expect(path).toBeTruthy();
  if (!path) throw new Error("Missing invoice file URL");
  const file = await page.request.get(path);
  expect(file.status()).toBe(200);
  expect(file.headers()["content-type"]).toBe("image/png");
  expect(await file.body()).toEqual(png);
  expect((await request.get(path)).ok()).toBe(true);
  const download = await page.request.get((await downloadLink.getAttribute("href"))!);
  expect(download.headers()["content-disposition"]).toMatch(/^attachment/);

  await page.getByRole("link", { name: "Back to invoices" }).click();
  await page.getByLabel("Search invoices").fill(supplierName);
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("link", { name: fileName })).toBeVisible();
  await page.getByRole("button", { name: `Open account menu for ${email}` }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get(path)).status()).toBe(401);
});
