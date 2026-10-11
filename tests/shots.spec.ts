import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

/**
 * Named captures for human review. These are screenshots, not assertions —
 * a human must judge the visual result.
 *
 * Written outside outputDir (`test-results/`), which Playwright wipes on every
 * run and would destroy the review set on any single-test run.
 */
const OUT = "screenshots";

/** Never reach the real Supabase project from a screenshot run. */
test.beforeEach(async ({ page }) => {
  await page.route("**/rest/v1/rpc/room_id_for_code**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify("11111111-2222-3333-4444-555555555555"),
    })
  );
  await page.route("**/rest/v1/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  );
});

test.beforeAll(async () => {
  await mkdir(OUT, { recursive: true });
});

test("landing captures for review", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: `${OUT}/landing-390-light.png` });

  // The app resolves its theme at mount, so drive the real toggle rather than
  // emulating the color scheme after load.
  await page.getByRole("button", { name: /appearance/ }).click();
  await expect(page.locator(".app")).toHaveClass(/theme-dark/);
  await page.screenshot({ path: `${OUT}/landing-390-dark.png` });
  await page.getByRole("button", { name: /appearance/ }).click();

  await page.getByLabel("Room code").fill("ABC234");
  await page.screenshot({ path: `${OUT}/landing-390-filled.png` });

  await page.getByRole("button", { name: "Open camera" }).click();
  await page.waitForURL("**/r/ABC234");
  await page.screenshot({ path: `${OUT}/join-390-light.png` });

  // The rejected-code state the landing now shows before any navigation.
  await page.route("**/rest/v1/rpc/room_id_for_code**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "null" })
  );
  await page.goto("/");
  await page.getByLabel("Room code").fill("AB23CD");
  await page.getByRole("button", { name: "Open camera" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.screenshot({ path: `${OUT}/landing-390-bad-code.png` });

  await page.goto("/");
  await page.getByTestId("host-door").click();
  await page.screenshot({ path: `${OUT}/landing-390-host-signin.png` });

  await page.goto("/");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: `${OUT}/landing-1440-light.png` });
});
