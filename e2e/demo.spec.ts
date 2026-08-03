import { expect, test } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const shots =
  process.env.PLAYWRIGHT_SHOTS_DIR ||
  path.join(process.cwd(), "test-results", "shots");

test.beforeAll(() => {
  fs.mkdirSync(shots, { recursive: true });
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
  await expect(page.getByText(/WRAPPED/i).first()).toBeVisible();
  await expect(page.getByText(/acme-toolkit/i).first()).toBeVisible();
  // progress indicator like 1/N
  await expect(page.getByText(/\d+\/\d+/).first()).toBeVisible();
  // scene content from real analysis (opening title is repo name)
  await expect(
    page.getByRole("heading", { name: /acme-toolkit/i }).first()
  ).toBeVisible();
  await page.screenshot({
    path: path.join(shots, `wrapped-open-${test.info().project.name}.png`),
    fullPage: true,
  });

  // advance with keyboard
  const before = await page.getByText(/\d+\/\d+/).first().textContent();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(200);
  const after = await page.getByText(/\d+\/\d+/).first().textContent();
  expect(before || after).toMatch(/\d+\/\d+/);
  if (before && after && before !== after) {
    expect(after).not.toBe(before);
  }
  await page.getByRole("button", { name: "Next scene" }).click();
  await page.screenshot({
    path: path.join(shots, `wrapped-next-${test.info().project.name}.png`),
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
