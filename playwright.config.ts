import { defineConfig, devices } from "@playwright/test";

/**
 * Scripted UI checks for the Momento landing page and the doors around it.
 *
 * These checks prove render, routing, input handling, and a11y basics in a
 * deterministic browser. They cannot prove the camera, a real magic-link
 * email, or a real QR scan — those need a real device.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: [["list", { printSteps: true }], ["html", { open: "never" }]],
  outputDir: "./test-results",
  use: {
    baseURL: "http://localhost:5173",
    // Design starts at phone width (PRODUCT.md principle 4).
    viewport: { width: 390, height: 844 },
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 5"] } },
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
