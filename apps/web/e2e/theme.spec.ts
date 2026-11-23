import { expect, test } from "@playwright/test";

const themeKey = "ledgermind-theme";

async function chooseTheme(page: import("@playwright/test").Page, theme: "Light" | "Dark" | "System") {
  await page.getByRole("button", { name: "Change color theme" }).click();
  await page.getByRole("menuitemradio", { name: theme }).click();
}

test("persists explicit light and dark preferences", async ({ page }) => {
  await page.goto("/login");

  await chooseTheme(page, "Dark");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), themeKey)).toBe("dark");

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await chooseTheme(page, "Light");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), themeKey)).toBe("light");

  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("system mode follows changes to the operating-system preference", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/login");
  await chooseTheme(page, "System");

  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), themeKey)).toBe("system");

  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("theme selector is keyboard accessible and hydrates without errors", async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /hydration/i.test(message.text())) hydrationErrors.push(message.text());
  });

  await page.goto("/login");
  const toggle = page.getByRole("button", { name: "Change color theme" });
  await toggle.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("menuitemradio", { name: "Light" })).toBeVisible();
  await expect(page.getByRole("menuitemradio", { name: "Dark" })).toBeVisible();
  await expect(page.getByRole("menuitemradio", { name: "System" })).toBeVisible();
  expect(hydrationErrors).toEqual([]);
});
