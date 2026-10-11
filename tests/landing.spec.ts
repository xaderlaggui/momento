import { test, expect, type Page } from "@playwright/test";

/** Supabase storage key format: sb-<project-ref>-auth-token. */
const SESSION_KEY = "sb-geyshnkbbfuqqndbnzmo-auth-token";

function fakeSession({ anonymous = false }: { anonymous?: boolean } = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTEyMzQtMTIzNC0xMjM0NTY3ODlhYmMiLCJleHAiOjk5OTk5OTk5OTl9.test",
    refresh_token: "fake-refresh-token",
    token_type: "bearer",
    expires_in: 3_600_000,
    expires_at: now + 3_600_000,
    user: {
      id: "12345678-1234-1234-1234-123456789abc",
      email: anonymous ? "" : "host@example.com",
      is_anonymous: anonymous,
      aud: "authenticated",
      role: "authenticated",
    },
  };
}

/** Never touch the real Supabase project. */
const ROOM_ID = "11111111-2222-3333-4444-555555555555";

async function stubSupabase(page: Page) {
  await page.route("**/auth/v1/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        route.request().url().includes("/user")
          ? fakeSession().user
          : route.request().url().includes("/otp")
            ? {}
            : fakeSession()
      ),
    })
  );
  // room_id_for_code is the landing's code check. Default: the code is valid.
  // Return `body: "null"` from a test to simulate an unknown code.
  await page.route("**/rest/v1/rpc/room_id_for_code**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ROOM_ID),
    })
  );
  await page.route("**/rest/v1/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  );
}

const isDesktop = ({ projectName }: { projectName: string }) => projectName === "desktop";

test.beforeEach(async ({ page }) => {
  await stubSupabase(page);
});

test("root is the landing door and does not redirect", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "One camera. Everyone in the frame." })).toBeVisible();
  await expect(page.getByLabel("Room code")).toBeVisible();
  await expect(page).toHaveURL("http://localhost:5173/");
});

test("every old door lands on the landing", async ({ page }) => {
  for (const path of ["/login", "/join", "/r"]) {
    await page.goto(path);
    await expect(page).toHaveURL("http://localhost:5173/");
    await expect(page.getByLabel("Room code")).toBeVisible();
  }
});

test("guest room and camera routes are untouched", async ({ page }) => {
  await page.goto("/r/ABC123");
  await expect(page.getByRole("heading", { name: "Join the camera" })).toBeVisible();
  await expect(page.getByText("MOMENTO CAMERA · ABC123")).toBeVisible();

  await page.goto("/r/ABC123/camera");
  // No guest session yet — the camera bounces back to the join screen.
  await expect(page).toHaveURL("http://localhost:5173/r/ABC123");
});

test("code input normalizes to the host alphabet", async ({ page }) => {
  await page.goto("/");
  const input = page.getByLabel("Room code");

  await input.fill("abc");
  await expect(input).toHaveValue("ABC");

  await input.fill("o0i1l");
  await expect(input).toHaveValue("");

  await input.fill("ABCDEFGH");
  await expect(input).toHaveValue("ABCDEF");
});

test("submit is gated, then navigates to the room", async ({ page }) => {
  await page.goto("/");
  const submit = page.getByRole("button", { name: "Open camera" });
  const input = page.getByLabel("Room code");
  await expect(submit).toBeDisabled();

  // Five valid characters — one short of a full code. The button stays disabled.
  await input.fill("AB23C");
  await expect(submit).toBeDisabled();

  // Enter bypasses the disabled button, so the guard must fire its own error.
  await input.press("Enter");
  await expect(page.getByRole("alert")).toHaveText(
    "Room codes are 6 characters. Check with the host."
  );

  await input.fill("AB23CD");
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page).toHaveURL("http://localhost:5173/r/AB23CD");
});

test("Enter key submits the code", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Room code").fill("ABC234");
  await page.getByLabel("Room code").press("Enter");
  await expect(page).toHaveURL("http://localhost:5173/r/ABC234");
});
test("host sign-in opens on the same screen and returns", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("host-door").click();

  await expect(page.getByTestId("host-sign-in")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
  await expect(page.getByRole("heading", { name: "Sign in to host" })).toBeVisible();

  await page.getByRole("button", { name: "Back to code" }).click();
  await expect(page.getByLabel("Room code")).toBeVisible();
});

test("email magic link is gated and reports the sent state", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("host-door").click();

  const send = page.getByRole("button", { name: "Send magic link" });
  await expect(send).toBeDisabled();

  await page.getByLabel("Email").fill("host@example.com");
  await expect(send).toBeEnabled();
  await send.click();

  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await expect(page.getByText(/We sent a magic link to host@example\.com/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Resend link" })).toBeVisible();
});

test("a signed-in host is forwarded to their cameras", async ({ page }) => {
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key as string, value as string),
    [SESSION_KEY, JSON.stringify(fakeSession())] as const
  );
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard/);
});

test("an anonymous guest session stays on the landing", async ({ page }) => {
  // Guests sign in anonymously (src/lib/guest.ts). Forwarding them into the
  // host dashboard would trap them out of the guest flow.
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key as string, value as string),
    [SESSION_KEY, JSON.stringify(fakeSession({ anonymous: true }))] as const
  );
  await page.goto("/");
  await expect(page).toHaveURL("http://localhost:5173/");
  await expect(page.getByLabel("Room code")).toBeVisible();
});

test("an anonymous session is not host access to /dashboard", async ({ page }) => {
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key as string, value as string),
    [SESSION_KEY, JSON.stringify(fakeSession({ anonymous: true }))] as const
  );
  await page.goto("/dashboard");
  await expect(page).toHaveURL("http://localhost:5173/");
});

test("a valid code is checked against a real room, then navigates", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Room code").fill("AB23CD");

  const rpc = page.waitForRequest("**/rest/v1/rpc/room_id_for_code**");
  await page.getByRole("button", { name: "Open camera" }).click();
  await rpc;
  await expect(page).toHaveURL("http://localhost:5173/r/AB23CD");
});

test("an unknown code is rejected on the landing, never navigated", async ({ page }) => {
  await page.route("**/rest/v1/rpc/room_id_for_code**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "null" })
  );

  await page.goto("/");
  await page.getByLabel("Room code").fill("AB23CD");
  await page.getByRole("button", { name: "Open camera" }).click();

  await expect(page.getByRole("alert")).toHaveText(
    "No camera with that code. Check with the host."
  );
  await expect(page).toHaveURL("http://localhost:5173/");
  // The code stays entered so the guest can correct it in place.
  await expect(page.getByLabel("Room code")).toHaveValue("AB23CD");
});

test("a failed check shows the button checking, then restores it", async ({ page }, testInfo) => {
  test.skip(isDesktop(testInfo), "phone-only");

  await page.route("**/rest/v1/rpc/room_id_for_code**", (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: '{"message":"boom"}' })
  );

  await page.goto("/");
  await page.getByLabel("Room code").fill("AB23CD");
  const submit = page.getByRole("button", { name: "Open camera" });
  await submit.click();

  await expect(submit).toBeEnabled();
  await expect(submit).toHaveText("Open camera");
  await expect(page.getByRole("alert")).toBeVisible();
});

test("404 routes the guest into the code door", async ({ page }) => {
  await page.goto("/nope");
  await expect(page.getByRole("heading", { name: "This camera does not exist" })).toBeVisible();
  await page.getByRole("button", { name: "Enter a code" }).click();
  await expect(page.getByLabel("Room code")).toBeVisible();
});

test("theme toggle works from the landing", async ({ page }) => {
  await page.goto("/");
  const app = page.locator(".app");
  await expect(app).not.toHaveClass(/theme-dark/);
  await page.getByRole("button", { name: /appearance/ }).click();
  await expect(app).toHaveClass(/theme-dark/);
});

test("no horizontal overflow", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("phone basics: autofocus, labeled input, tap targets", async ({ page }, testInfo) => {
  test.skip(isDesktop(testInfo), "phone-only");

  await page.goto("/");

  await expect(page.getByLabel("Room code")).toBeFocused();

  // The code input comes first in DOM order, so Tab lands on the host button,
  // which is enabled — a disabled control cannot take focus at all.
  const hostButton = page.getByTestId("host-door");
  await page.keyboard.press("Tab");
  await expect(hostButton).toBeFocused();

  // :focus-visible is styled in the stylesheet; keyboard focus must show a ring.
  const outline = await hostButton.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe("none");

  for (const locator of [
    hostButton,
    page.getByRole("button", { name: "Open camera" }),
    page.getByRole("button", { name: /appearance/ }),
  ]) {
    const box = await locator.first().boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  }

  // The code field is the one-handed, group-sized target.
  const code = await page.getByLabel("Room code").boundingBox();
  expect(code?.height ?? 0).toBeGreaterThanOrEqual(60);
});
