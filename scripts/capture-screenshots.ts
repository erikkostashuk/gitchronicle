/**
 * Capture marketing screenshots into docs/screenshots/ against a running app.
 *
 * Usage:
 *   pnpm seed && pnpm build && PORT=3000 pnpm start &
 *   pnpm screenshots
 *
 * Or with an existing server:
 *   PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 pnpm screenshots
 */
import { chromium, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const outDir = path.join(process.cwd(), "docs", "screenshots");
const slug = "acme-toolkit";

async function waitReady(page: Page) {
  await page.goto(`${baseURL}/api/health`, { waitUntil: "networkidle" });
  const ok = await page.evaluate(async (url) => {
    const res = await fetch(url);
    return res.ok;
  }, `${baseURL}/api/health`);
  if (!ok) throw new Error(`Health check failed at ${baseURL}`);
}

async function shot(
  page: Page,
  name: string,
  opts: { fullPage?: boolean } = {}
) {
  const file = path.join(outDir, name);
  await page.screenshot({
    path: file,
    fullPage: opts.fullPage ?? false,
    type: "png",
  });
  const size = fs.statSync(file).size;
  console.log(`  wrote ${name} (${Math.round(size / 1024)} KB)`);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`Capturing screenshots from ${baseURL} → ${outDir}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    colorScheme: "light",
  });
  // Product default is light; force storage so capture is deterministic
  await context.addInitScript(() => {
    try {
      localStorage.setItem("gitchronicle-theme", "light");
    } catch {
      /* ignore */
    }
  });

  const page = await context.newPage();
  await waitReady(page);

  // Landing
  await page.goto(`${baseURL}/`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1 }).waitFor();
  await shot(page, "landing.png", { fullPage: true });

  // Wrapped open
  await page.goto(`${baseURL}/repo/${slug}/wrapped`, {
    waitUntil: "networkidle",
  });
  await page.getByTestId("wrapped-player").waitFor({ timeout: 15_000 });
  await page.getByTestId("wrapped-counter").waitFor();
  // Pause autoplay so frames are stable
  const auto = page.getByTestId("wrapped-autoplay");
  if (await auto.count()) {
    const state = await page.getByTestId("wrapped-player").getAttribute("data-autoplay");
    if (state === "on") await auto.click();
  }
  await page.waitForTimeout(400);
  await shot(page, "wrapped.png");
  await shot(page, "wrapped-open.png");

  // Advance a couple scenes for variety
  await page.getByTestId("wrapped-player").focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(350);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(350);
  await shot(page, "wrapped-next.png");

  // Dashboard sections
  const sections: { path: string; file: string; heading?: RegExp }[] = [
    { path: `/repo/${slug}`, file: "overview.png", heading: /Overview/i },
    {
      path: `/repo/${slug}/timemachine`,
      file: "time-machine.png",
      heading: /Time Machine/i,
    },
    { path: `/repo/${slug}/hotspots`, file: "hotspots.png", heading: /Hotspots/i },
    { path: `/repo/${slug}/people`, file: "people.png", heading: /People/i },
    {
      path: `/repo/${slug}/evolution`,
      file: "evolution.png",
      heading: /Evolution/i,
    },
    { path: `/repo/${slug}/graphs`, file: "graphs.png", heading: /Graphs/i },
    {
      path: `/repo/${slug}/releases`,
      file: "releases.png",
      heading: /Releases/i,
    },
    { path: `/repo/${slug}/story`, file: "story.png", heading: /Story/i },
  ];

  for (const s of sections) {
    await page.goto(`${baseURL}${s.path}`, { waitUntil: "networkidle" });
    if (s.heading) {
      await page.getByRole("heading", { name: s.heading }).first().waitFor({
        timeout: 10_000,
      });
    }
    await page.waitForTimeout(250);
    await shot(page, s.file, {
      fullPage: s.file === "overview.png" || s.file === "landing.png",
    });
  }

  await browser.close();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
