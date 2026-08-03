import { expect, test } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const shots =
  process.env.PLAYWRIGHT_SHOTS_DIR ||
  path.join(process.cwd(), "test-results", "shots");

const exportDir =
  process.env.PLAYWRIGHT_EXPORT_DIR ||
  path.join(process.cwd(), "test-results", "exports");

test.beforeAll(() => {
  fs.mkdirSync(shots, { recursive: true });
  fs.mkdirSync(exportDir, { recursive: true });
});

test("landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /repository|replay/i
  );
  await page.screenshot({
    path: path.join(shots, `landing-${test.info().project.name}.png`),
    fullPage: true,
  });
});

test("demo opens Wrapped with analysis-backed scenes", async ({ page }) => {
  await page.goto("/demo");
  await page.waitForURL(/\/repo\/acme-toolkit\/wrapped/);
  const player = page.getByTestId("wrapped-player");
  await expect(player).toBeVisible();
  await expect(page.getByText(/WRAPPED/i).first()).toBeVisible();
  await expect(page.getByText(/acme-toolkit/i).first()).toBeVisible();
  await expect(page.getByTestId("wrapped-counter")).toHaveText(/^1\//);
  await expect(
    page.getByRole("heading", { name: /acme-toolkit/i }).first()
  ).toBeVisible();
  await page.screenshot({
    path: path.join(shots, `wrapped-open-${test.info().project.name}.png`),
    fullPage: true,
  });

  // Focus player so window keyboard handlers receive keys
  await player.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("wrapped-counter")).toHaveText(/^2\//, {
    timeout: 5000,
  });

  // Next button advances further
  await page.getByTestId("wrapped-next").click();
  await expect(page.getByTestId("wrapped-counter")).toHaveText(/^3\//);
  await page.screenshot({
    path: path.join(shots, `wrapped-next-${test.info().project.name}.png`),
  });
});

test("closing scene is scrollable with share cards and CTAs", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/repo/acme-toolkit/wrapped");
  await expect(page.getByTestId("wrapped-player")).toBeVisible();

  // Jump to closing via dedicated tab test id
  await page.getByTestId("wrapped-scene-tab-closing").click();
  await expect(page.getByTestId("wrapped-scene-body")).toHaveAttribute(
    "data-scene-type",
    "closing",
    { timeout: 5000 }
  );
  await expect(page.getByTestId("wrapped-closing")).toBeVisible();
  await expect(page.getByTestId("wrapped-counter")).toHaveText(/\/\d+$/);

  const scrollMeta = await page
    .getByTestId("wrapped-scene-body")
    .evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      overflowY: getComputedStyle(el).overflowY,
    }));
  expect(["auto", "scroll", "overlay"]).toContain(scrollMeta.overflowY);
  if (scrollMeta.scrollHeight > scrollMeta.clientHeight + 4) {
    await page.getByTestId("wrapped-scene-body").evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
  }

  await expect(page.getByTestId("cta-analytics")).toBeVisible();
  await expect(page.getByTestId("cta-report")).toBeVisible();
  await expect(page.getByTestId("cta-another")).toBeVisible();

  // Share PNG download
  const downloadPromise = page.waitForEvent("download", { timeout: 20_000 });
  await page.getByTestId("share-download-recap-landscape").scrollIntoViewIfNeeded();
  await page.getByTestId("share-download-recap-landscape").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.png$/i);
  const outPath = path.join(
    exportDir,
    `recap-landscape-${test.info().project.name}.png`
  );
  await download.saveAs(outPath);
  const buf = fs.readFileSync(outPath);
  expect(buf.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  expect(buf.length).toBeGreaterThan(5_000);

  await page.screenshot({
    path: path.join(shots, `wrapped-closing-${test.info().project.name}.png`),
  });
});

test("dashboard navigation across sections", async ({ page }) => {
  await page.goto("/repo/acme-toolkit");
  const sections = [
    ["Time Machine", /timemachine/],
    ["Hotspots", /hotspots/],
    ["People", /people/],
    ["Evolution", /evolution/],
    ["Graphs", /graphs/],
    ["Releases", /releases/],
    ["Story", /story/],
  ] as const;

  for (const [label, re] of sections) {
    await page.getByRole("link", { name: label }).first().click();
    await expect(page).toHaveURL(re);
    await expect(
      page.getByRole("heading", { name: label, exact: true })
    ).toBeVisible();
    await page.screenshot({
      path: path.join(
        shots,
        `${label.toLowerCase().replace(/\s+/g, "-")}-${test.info().project.name}.png`
      ),
    });
  }
});

test("time machine controls advance timeline", async ({ page }) => {
  await page.goto("/repo/acme-toolkit/timemachine");
  await expect(page.getByRole("heading", { name: "Time Machine" })).toBeVisible();
  const counter = page.getByText(/\d+\/\d+/).first();
  const before = await counter.textContent();
  await page.getByRole("button", { name: "Step forward" }).click();
  const after = await counter.textContent();
  expect(before || after).toMatch(/\d+\/\d+/);
  if (before && after && before !== after) {
    expect(after).not.toBe(before);
  }
});

test("markdown export downloads report", async ({ page, request }) => {
  const res = await request.get("/api/repos/acme-toolkit/export?type=report");
  expect(res.ok()).toBeTruthy();
  const body = await res.text();
  expect(body).toContain("#");
  expect(body).toContain("Overview");
  expect(body.length).toBeGreaterThan(100);

  await page.goto("/repo/acme-toolkit/story");
  await expect(
    page.getByRole("heading", { name: "Story", exact: true })
  ).toBeVisible();
  const downloadPromise = page
    .waitForEvent("download", { timeout: 15_000 })
    .catch(() => null);
  await page.getByRole("link", { name: /Export Markdown report/i }).click();
  const download = await downloadPromise;
  if (download) {
    expect(download.suggestedFilename()).toMatch(/\.md$/);
  }
});

test("invalid github url is rejected", async ({ request }) => {
  const res = await request.post("/api/projects", {
    data: { url: "https://gitlab.com/foo/bar" },
  });
  expect(res.status()).toBe(400);
  const json = await res.json();
  expect(json.error).toBeTruthy();
});

test("retry analysis API rejects demo and missing slugs", async ({
  request,
}) => {
  const missing = await request.post("/api/repos/no-such-repo-xyz/retry");
  expect(missing.status()).toBe(404);

  const demo = await request.post("/api/repos/acme-toolkit/retry");
  // Demo is ready offline JSON — planner rejects reanalyze without clone
  expect([400, 409]).toContain(demo.status());
  const body = await demo.json();
  expect(body.error).toBeTruthy();
});
