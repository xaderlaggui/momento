import { expect, type Page } from "@playwright/test";

/**
 * Shared stubs for the review-capture specs. Nothing here may reach the real
 * Supabase project, and photos resolve to generated placeholder art so the
 * polaroid grid can actually be judged.
 */
export const OUT = "screenshots";
export const SESSION_KEY = "sb-geyshnkbbfuqqndbnzmo-auth-token";
export const GUEST_KEY = "momento.guest";
export const ROOM_ID = "11111111-2222-3333-4444-555555555555";
export const OTHER_ROOM_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
export const USER_ID = "12345678-1234-1234-1234-123456789abc";
export const CODE = "ABC234";
export const SHOTS = 20;

export function fakeSession(anonymous = false) {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: "stub.access.token",
    refresh_token: "stub-refresh",
    token_type: "bearer",
    expires_in: 3_600_000,
    expires_at: now + 3_600_000,
    user: {
      id: USER_ID,
      email: anonymous ? "" : "host@example.com",
      is_anonymous: anonymous,
      aud: "authenticated",
      role: "authenticated",
    },
  };
}

export const rooms = [
  {
    id: ROOM_ID,
    code: CODE,
    owner_id: USER_ID,
    name: "Maya & Theo",
    event_date: "2026-10-11",
    status: "open",
    max_members: 8,
    created_at: "2026-10-11T18:04:00Z",
  },
  {
    id: OTHER_ROOM_ID,
    code: "K7M2QP",
    owner_id: USER_ID,
    name: "Studio wrap party",
    event_date: null,
    status: "closed",
    max_members: 10,
    created_at: "2026-09-02T21:10:00Z",
  },
];

export const members = [
  { id: "m1", room_id: ROOM_ID, auth_user_id: "a1", display_name: "Maya", token: "t1", joined_at: "2026-10-11T18:05:00Z" },
  { id: "m2", room_id: ROOM_ID, auth_user_id: "a2", display_name: "Theo", token: "t2", joined_at: "2026-10-11T18:07:00Z" },
  { id: "m3", room_id: ROOM_ID, auth_user_id: "a3", display_name: "Priya", token: "t3", joined_at: "2026-10-11T18:11:00Z" },
];

/** Kept counts chosen to show all three ladder states: full, partial, empty. */
const keptPerMember: Record<string, number> = { m1: SHOTS, m2: 6, m3: 0 };

export const photos = members.flatMap((m) =>
  Array.from({ length: keptPerMember[m.id] }, (_, i) => {
    const n = i + 1;
    return {
      id: `${m.id}-p${n}`,
      room_id: ROOM_ID,
      member_id: m.id,
      storage_path: `room/${m.id}/keep-${String(n).padStart(2, "0")}.jpg`,
      status: "kept",
      created_at: `2026-10-11T18:${String(20 + n).padStart(2, "0")}:00Z`,
    };
  })
);

/** Placeholder "photo": a tinted frame, deterministic per storage path. */
function placeholderSvg(index: number): string {
  const hue = (index * 47) % 360;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="300" viewBox="0 0 240 300">
    <rect width="240" height="300" fill="hsl(${hue} 34% 58%)"/>
    <circle cx="120" cy="118" r="44" fill="hsl(${hue} 40% 78%)"/>
    <path d="M0 300 L96 190 L168 258 L240 200 L240 300 Z" fill="hsl(${hue} 30% 40%)"/>
  </svg>`;
}

export async function stubEverything(page: Page) {
  await page.route("**/auth/v1/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        route.request().url().includes("/user") ? fakeSession().user : fakeSession()
      ),
    })
  );

  await page.route("**/rest/v1/**", (route) => {
    const req = route.request();
    const url = req.url();
    const one = (req.headers()["accept"] ?? "").includes("pgrst.object");
    const json = (body: unknown, headers?: Record<string, string>) =>
      route.fulfill({ status: 200, contentType: "application/json", headers, body: JSON.stringify(body) });

    if (url.includes("/rpc/room_id_for_code")) return json(ROOM_ID);
    if (url.includes("/rpc/join_room")) return json(members[1]);
    if (url.includes("/rpc/rotate_room_code")) return json("NEW234");
    if (url.includes("/rpc/")) return json(null);
    if (url.includes("/rooms")) return one ? json(rooms[0]) : json(rooms);
    if (url.includes("/members")) return json(one ? members[0] : members);
    if (url.includes("/photos")) {
      // Count-only reads come back through Content-Range, not a body.
      if (req.method() === "HEAD" || url.includes("select=id"))
        return json([], {
          "Content-Range": `0-${photos.length - 1}/${url.includes(OTHER_ROOM_ID) ? 40 : photos.length}`,
        });
      // The camera's orphaned-pending lookup uses maybeSingle.
      if (url.includes("member_id=eq")) return json(null);
      return json(photos);
    }
    return json([]);
  });

  // Signed URLs are built as <storage-url> + <signedURL>, so hand back a path.
  await page.route("**/storage/v1/object/sign/**", (route) => {
    const n = (route.request().url().match(/keep-(\d+)/) ?? [])[1] ?? "1";
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ signedURL: `/object/sign/mock.svg?i=${n}` }),
    });
  });
  await page.route("**/storage/v1/object/sign/mock.svg*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: placeholderSvg(Number(new URL(route.request().url()).searchParams.get("i") ?? 1)),
    })
  );
}

/** Seed a session and wait out the cold-launch splash, or it covers the shot. */
export async function open(page: Page, path: string) {
  await page.goto(path);
  await page
    .locator(".splash")
    .waitFor({ state: "detached", timeout: 6000 })
    .catch(() => {});
}

/** Seed a stored session before any script runs. */
export async function seed(page: Page, key: string, value: unknown) {
  await page.addInitScript(
    ([k, v]) => window.localStorage.setItem(k, JSON.stringify(v)),
    [key, value] as const
  );
}

export { expect };
