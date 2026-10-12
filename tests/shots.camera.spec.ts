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
  await expect(shutter).toBeVisible({ timeout: 20_000 });

  // The shutter is enabled before the first frame lands, so wait for real
  // pixels — otherwise the tap reads as "Camera not ready".
  await expect
    .poll(
      () =>
        page
          .locator("video.viewfinder-image")
          .evaluate((v) => (v as HTMLVideoElement).videoWidth),
      { timeout: 20_000 }
    )
    .toBeGreaterThan(0);

  await page.screenshot({ path: `${OUT}/camera-390.png` });

  await shutter.click();
  await expect(page.getByRole("button", { name: "Keep photo" })).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: `${OUT}/camera-preview-390.png` });
});

test("camera blocked state for review", async ({ page }, testInfo) => {
  if (testInfo.project.name === "desktop") test.skip();

  // Deterministic denial: the fake device cannot reproduce a refused lens.
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
  });

  await open(page, `/r/${CODE}/camera`);
  await expect(page.locator(".camera-error")).toBeVisible();
  await page.screenshot({ path: `${OUT}/camera-blocked-390.png` });
});
