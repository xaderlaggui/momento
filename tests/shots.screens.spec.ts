import { test } from "@playwright/test";
import { CODE, GUEST_KEY, OUT, SESSION_KEY, expect, fakeSession, open, seed, stubEverything } from "./stubs";

/**
 * Named captures of the host and guest screens for human review. Screenshots,
 * not assertions — a human judges the result.
 */
test.beforeEach(async ({ page }, testInfo) => {
  await stubEverything(page);
  if (testInfo.project.name !== "desktop") await page.setViewportSize({ width: 390, height: 844 });
  await seed(page, SESSION_KEY, fakeSession());
});

test("host screens for review", async ({ page }, testInfo) => {
  const size = testInfo.project.name === "desktop" ? "1440" : "390";

  await open(page, "/dashboard");
  await expect(page.getByRole("heading", { name: "Your cameras" })).toBeVisible();
  await page.screenshot({ path: `${OUT}/dashboard-${size}-light.png` });

  await page.getByRole("button", { name: /appearance/ }).click();
  await expect(page.locator(".app")).toHaveClass(/theme-dark/);
  await page.screenshot({ path: `${OUT}/dashboard-${size}-dark.png` });
  await page.getByRole("button", { name: /appearance/ }).click();

  await open(page, `/room/${CODE}`);
  await expect(page.getByRole("heading", { name: "Maya & Theo" })).toBeVisible();
  await page.locator(".ladder").first().waitFor();
  await page.screenshot({ path: `${OUT}/room-${size}-light.png` });

  // Mobile only: the remaining host screens and the states behind a tap.
  if (size === "1440") return;

  await page.getByRole("button", { name: /Member limit/ }).click();
  await expect(page.locator(".sheet")).toBeVisible();
  await page.screenshot({ path: `${OUT}/room-sheet-390-light.png` });
  await page.keyboard.press("Escape");

  await open(page, `/room/${CODE}/share`);
  await expect(page.getByRole("heading", { name: "Pass it around" })).toBeVisible();
  await page.screenshot({ path: `${OUT}/share-390-light.png` });

  await open(page, "/account");
  await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
  await page.screenshot({ path: `${OUT}/account-390-light.png` });
});

test("roll-finished screen for review", async ({ page }, testInfo) => {
  const size = testInfo.project.name === "desktop" ? "1440" : "390";
  await seed(page, GUEST_KEY, { roomCode: CODE, memberId: "m2", token: "t2" });

  await open(page, `/r/${CODE}/done`);
  await expect(page.getByRole("heading", { name: /You used all 20/ })).toBeVisible();
  await expect(page.locator(".ladder--lg")).toBeVisible();
  await page.screenshot({ path: `${OUT}/done-${size}-light.png` });
});
