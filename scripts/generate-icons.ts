/**
 * Generate the raster icon set from `src/app/icon.svg`.
 *
 *   pnpm icons
 *
 * The SVG is the single source of truth; this script rasterises it with the
 * Playwright Chromium already used for e2e, so there is no image-processing
 * dependency to install. Outputs:
 *
 *   src/app/apple-icon.png  180×180  (iOS home screen)
 *   src/app/favicon.ico     16/32/48 (legacy + Windows taskbar)
 *
 * `src/app/icon.svg` itself is what modern browsers actually use — Next.js
 * wires all three up automatically via its file conventions.
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const appDir = path.join(process.cwd(), "src", "app");
const svgPath = path.join(appDir, "icon.svg");

async function render(svg: string, size: number): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  // Transparent page so the SVG's own tile defines every pixel
  await page.setContent(
    `<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px">
       <div style="width:${size}px;height:${size}px">${svg}</div>
     </body></html>`
  );
  await page.locator("svg").evaluate((el, s) => {
    el.setAttribute("width", String(s));
    el.setAttribute("height", String(s));
  }, size);
  const buf = await page.screenshot({ omitBackground: true, type: "png" });
  await browser.close();
  return buf;
}

/**
 * Minimal ICO container holding PNG payloads (supported since Windows Vista and
 * by every current browser). Layout: 6-byte ICONDIR, then one 16-byte
 * ICONDIRENTRY per image, then the image data.
 */
function buildIco(images: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(images.length, 4);

  const entries: Buffer[] = [];
  let offset = 6 + images.length * 16;

  for (const { size, png } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 means 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette size (0 = no palette)
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += png.length;
  }

  return Buffer.concat([
    header,
    ...entries,
    ...images.map((i) => i.png),
  ]);
}

async function main() {
  const svg = fs.readFileSync(svgPath, "utf8");
  console.log(`Rasterising ${path.relative(process.cwd(), svgPath)}`);

  const icoSizes = [16, 32, 48];
  const images = [];
  for (const size of icoSizes) {
    images.push({ size, png: await render(svg, size) });
    console.log(`  rendered ${size}×${size}`);
  }

  const ico = buildIco(images);
  fs.writeFileSync(path.join(appDir, "favicon.ico"), ico);
  console.log(`  wrote favicon.ico (${ico.length} bytes, ${icoSizes.join("/")})`);

  const apple = await render(svg, 180);
  fs.writeFileSync(path.join(appDir, "apple-icon.png"), apple);
  console.log(`  wrote apple-icon.png (${apple.length} bytes, 180×180)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
