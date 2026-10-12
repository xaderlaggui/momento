import { test } from "@playwright/test";
import { CODE, GUEST_KEY, OUT, expect, open, seed, stubEverything } from "./stubs";

/**
 * The camera is the signature screen and cannot be reached with a real lens in
 * CI, so Chromium's fake capture device stands in. Captures the live viewfinder
 * (the roll ladder under the frame) and the just-shot preview.
 */
test.use({
  permissions: ["camera"],
  launchOptions: {
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--autoplay-policy=no-user-gesture-required",
    ],
  },
});

test.beforeEach(async ({ page }, testInfo) => {
  await stubEverything(page);
  if (testInfo.project.name !== "desktop") await page.setViewportSize({ width: 390, height: 844 });
  await seed(page, GUEST_KEY, { roomCode: CODE, memberId: "m2", token: "t2" });
});

test("camera viewfinder and shot preview for review", async ({ page }, testInfo) => {
  if (testInfo.project.name === "desktop") test.skip();

  await open(page, `/r/${CODE}/camera`);
  const shutter = page.locator(".shutter");
  await expect(shutter).toBeVisible();

  // Let the fake device deliver real frames before judging the viewfinder.
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/camera-390.png` });

  await shutter.click();
  await expect(page.getByRole("button", { name: "Keep photo" })).toBeVisible();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/camera-preview-390.png` });
});
