import { test } from "@playwright/test";
import { CODE, GUEST_KEY, OUT, SESSION_KEY, expect, fakeSession, open, seed, stubEverything, stressRooms, stressMembers, stressPhotos } from "./stubs";

/**
 * Layout resilience: clipped text without ellipsis, content behind fixed bars,
 * narrow viewport (320), and long content stress. Programmatic gates.
 */
test.describe("layout resilience", () => {
  async function checkClipped(page) {
    const hits = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll("*").forEach((el) => {
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") return;
        if (el.closest(".wireframe-board, [aria-hidden='true'], .lightbox, .sheet, .toast, .splash")) return;
        const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim());
        if (!hasText) return;
        const text = el.textContent?.trim() ?? "";
        if (!text || text.length > 300) return;
        const sw = el.scrollWidth;
        const cw = el.clientWidth;
        const sh = el.scrollHeight;
        const ch = el.clientHeight;
        const clipsX = sw > cw + 1 && (cs.overflowX === "hidden" || cs.overflowX === "clip");
        const hasClamp = cs.webkitLineClamp && cs.webkitLineClamp !== "none";
        const clipsY = sh > ch + 1 && (cs.overflowY === "hidden" || cs.overflowY === "clip") && cs.textOverflow !== "ellipsis" && !hasClamp;
        if (clipsX && cs.textOverflow !== "ellipsis") {
          out.push({ cls: el.className || el.tagName, x: true, sw, cw, t: text.slice(0, 40) });
        }
        if (clipsY) {
          out.push({ cls: el.className || el.tagName, y: true, sh, ch, t: text.slice(0, 40) });
        }
      });
      return out;
    });
    return hits;
  }

  async function checkFixedBarOverlap(page) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(50);
    return await page.evaluate(() => {
      const bars = [...document.querySelectorAll(".lower-actions, .bottomnav")].map((b) => ({ cls: b.className, r: b.getBoundingClientRect() }));
      if (bars.length === 0) return [];
      const hits = [];
      document.querySelectorAll("button, h1, h2, p, a, .room-row, .photo-grid, .inset-list, .photo, .sheet__body").forEach((el) => {
        if (el.closest(".lower-actions, .bottomnav, .sheet, .toast, .lightbox, .splash")) return;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        for (const b of bars) {
          const ov = Math.min(r.bottom, b.r.bottom) - Math.max(r.top, b.r.top);
          if (ov > 4) {
            hits.push({ el: el.className || el.tagName, bar: b.cls, ov: Math.round(ov) });
          }
        }
      });
      return hits;
    });
  }

  async function checkOverflow(page) {
    const vw = await page.evaluate(() => window.innerWidth);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    return { vw, sw, hasH: sw > vw + 2 };
  }

  async function setDark(page) {
    await page.evaluate(() => document.querySelector(".app")?.classList.add("theme-dark"));
  }

  test.beforeEach(async ({ page }, testInfo) => {
    await stubEverything(page);
    if (testInfo.project.name !== "desktop") await page.setViewportSize({ width: 390, height: 844 });
    await seed(page, SESSION_KEY, fakeSession());
  });

  const routes = [
    { name: "dashboard", path: "/dashboard", heading: /Your cameras/i, needsDark: true, hasNav: true },
    { name: "room", path: `/room/${CODE}`, heading: "Maya & Theo", needsDark: true, hasNav: true },
    { name: "share", path: `/room/${CODE}/share`, heading: /Pass it around/i },
    { name: "account", path: "/account", heading: "Account", needsDark: true },
    { name: "done", path: `/r/${CODE}/done`, heading: /used all 20|You used/i, guest: true, needsDark: true },
    { name: "landing", path: "/", heading: /One camera/i },
  ];

  for (const r of routes) {
    test(`390: ${r.name} - overflow/clipping/bars`, async ({ page }) => {
      if (r.guest) await seed(page, GUEST_KEY, { roomCode: CODE, memberId: "m2", token: "t2" });
      await open(page, r.path);
      const h = page.getByRole("heading", { name: r.heading });
      await h.waitFor({ timeout: 6000 }).catch(() => {});
      if (r.needsDark) await setDark(page);
      const ov = await checkOverflow(page);
      expect(ov.hasH, `horizontal overflow ${ov.sw}px > ${ov.vw}px on ${r.name}`).toBe(false);
      const clipped = await checkClipped(page);
      expect(clipped, `clipped text on ${r.name}`).toEqual([]);
      const bars = await checkFixedBarOverlap(page);
      expect(bars, `content behind fixed bar on ${r.name}`).toEqual([]);
    });

    test(`390: ${r.name} - dark theme clean`, async ({ page }) => {
      if (r.guest) await seed(page, GUEST_KEY, { roomCode: CODE, memberId: "m2", token: "t2" });
      await open(page, r.path);
      await setDark(page);
      const ov = await checkOverflow(page);
      expect(ov.hasH).toBe(false);
      const clipped = await checkClipped(page);
      expect(clipped).toEqual([]);
    });
  }

  test("320: narrow viewport - landing/dashboard/room", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    const cases = [
      { path: "/", heading: /One camera/i },
      { path: "/dashboard", heading: /Your cameras/i },
      { path: `/room/${CODE}`, heading: "Maya & Theo" },
    ];
    for (const c of cases) {
      await open(page, c.path);
      await page.getByRole("heading", { name: c.heading }).waitFor({ timeout: 6000 }).catch(() => {});
      const ov = await checkOverflow(page);
      expect(ov.hasH, `320 overflow on ${c.path}`).toBe(false);
      const clipped = await checkClipped(page);
      expect(clipped, `320 clipped on ${c.path}`).toEqual([]);
      const bars = await checkFixedBarOverlap(page);
      expect(bars, `320 bars on ${c.path}`).toEqual([]);
    }
  });

  test("long content: dashboard/room with long names + many photos", async ({ page }) => {
    await stubEverything(page, { rooms: stressRooms, members: stressMembers, photos: stressPhotos });
    await open(page, "/dashboard");
    await page.getByRole("heading", { name: /Your cameras/i }).waitFor({ timeout: 6000 });
    let ov = await checkOverflow(page);
    expect(ov.hasH).toBe(false);
    expect(await checkClipped(page)).toEqual([]);
    await open(page, `/room/${CODE}`);
    await page.getByRole("heading", { name: /Priya & Alex/i }).waitFor({ timeout: 6000 });
    ov = await checkOverflow(page);
    expect(ov.hasH).toBe(false);
    expect(await checkClipped(page)).toEqual([]);
    const bars = await checkFixedBarOverlap(page);
    expect(bars).toEqual([]);
  });
});
