import { expect, test } from "@playwright/test";

const email = process.env.PLAYWRIGHT_ADMIN_EMAIL;
const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD;

async function signIn(page: import("@playwright/test").Page) {
  if (!email || !password) return;
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/suppliers$/);
}

test("desktop shell supports navigation, breadcrumbs, collapse, and account sign-out", async ({ page }) => {
  test.skip(!email || !password, "Supply a dedicated admin account for the application shell workflow.");
  if (!email || !password) return;
  await page.setViewportSize({ width: 1280, height: 800 });
  await signIn(page);

  await expect(page.getByRole("navigation", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Suppliers");
  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  await expect(page.getByRole("link", { name: "Invoices" })).toBeVisible();
  await page.getByRole("link", { name: "Invoices" }).click();
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Invoices");

  await page.getByRole("button", { name: `Open account menu for ${email}` }).click();
  await expect(page.getByText("Administrator", { exact: true })).toBeVisible();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("mobile shell opens off-canvas navigation and closes it after navigation", async ({ page }) => {
  test.skip(!email || !password, "Supply a dedicated admin account for the application shell workflow.");
  if (!email || !password) return;
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);

  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  const dialog = page.getByRole("dialog", { name: "Navigation" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("link", { name: "Invoices" }).click();
  await expect(page).toHaveURL(/\/invoices$/);
  await expect(dialog).toBeHidden();
});
