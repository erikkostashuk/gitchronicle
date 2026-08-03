"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WrappedShareCard } from "@/lib/wrapped";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { SceneTheme } from "./scene-theme";

/** Warm-press share card palette — paper, ink, one saturated field per kind. */
const PAPER = "#fbf7f1";
const INK = "#16130f";
const INK_SOFT = "#6d6558";

const KIND_ACCENT: Record<WrappedShareCard["kind"], string> = {
  recap: "#2447f0",
  personality: "#7c3aed",
  top_contributor: "#ff4d2e",
  rising_star: "#f5a524",
  busiest: "#0e9f8e",
  streak: "#7d9412",
  language: "#2447f0",
  dramatic_file: "#ff4d2e",
};

function drawCard(
  canvas: HTMLCanvasElement,
  card: WrappedShareCard,
  size: "landscape" | "square",
  scale = 1
) {
  const w = size === "landscape" ? 1200 : 1080;
  const h = size === "landscape" ? 630 : 1080;
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  const accent = KIND_ACCENT[card.kind] ?? "#ff4d2e";
  const pad = size === "landscape" ? 72 : 84;

  // Paper
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);

  // Saturated corner field (large colour block, clipped to a soft arc)
  ctx.save();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(w, 0);
  ctx.lineTo(w, h * 0.62);
  ctx.quadraticCurveTo(w * 0.72, h * 0.42, w * 0.6, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Second, lighter field for depth
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(w * 0.12, h * 0.94, h * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Grain
  ctx.fillStyle = "rgba(22,19,15,0.05)";
  for (let i = 0; i < 900; i++) {
    const x = (i * 137.5) % w;
    const y = (i * 79.3) % h;
    ctx.fillRect(x, y, 1.6, 1.6);
  }

  // Masthead
  ctx.fillStyle = INK;
  ctx.font = "700 22px ui-sans-serif, system-ui, sans-serif";
  ctx.letterSpacing = "4px";
  ctx.fillText("GITCHRONICLE WRAPPED", pad, pad + 10);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = INK_SOFT;
  ctx.font = "600 30px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(card.repoName, pad, pad + 62);

  // Rule
  ctx.fillStyle = accent;
  ctx.fillRect(pad, pad + 92, 96, 6);

  ctx.fillStyle = INK_SOFT;
  ctx.font = "600 26px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(card.headline.toUpperCase(), pad, pad + 156);

  // Hero stat
  ctx.fillStyle = INK;
  const hero = card.stat;
  const heroSize = hero.length > 24 ? 62 : hero.length > 12 ? 84 : 128;
  ctx.font = `800 ${heroSize}px ui-sans-serif, system-ui, sans-serif`;
  const maxHeroWidth = w - pad * 2 - (size === "landscape" ? 220 : 0);
  const lines = wrapText(ctx, hero, maxHeroWidth);
  let y = pad + 156 + heroSize + 24;
  for (const line of lines.slice(0, 3)) {
    ctx.fillText(line, pad, y);
    y += heroSize * 0.94;
  }

  ctx.fillStyle = INK_SOFT;
  ctx.font = "500 30px ui-sans-serif, system-ui, sans-serif";
  const detailLines = wrapText(ctx, card.detail, w - pad * 2);
  y += 16;
  for (const line of detailLines.slice(0, 3)) {
    ctx.fillText(line, pad, y);
    y += 40;
  }

  // Footer
  ctx.fillStyle = INK;
  ctx.fillRect(pad, h - pad - 34, w - pad * 2, 2);
  ctx.fillStyle = INK_SOFT;
  ctx.font = "500 20px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Watch a codebase become itself", pad, h - pad + 4);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function CardPreview({ card }: { card: WrappedShareCard }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) drawCard(ref.current, card, "landscape", 0.34);
  }, [card]);
  return (
    <canvas
      ref={ref}
      className="block aspect-[1200/630] w-full rounded-lg"
      aria-hidden
    />
  );
}

export function ShareCardDownloader({
  cards,
  theme,
}: {
  cards: WrappedShareCard[];
  theme?: SceneTheme;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const download = useCallback(
    (card: WrappedShareCard, size: "landscape" | "square") => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      setBusy(`${card.kind}-${size}`);
      drawCard(canvas, card, size);
      requestAnimationFrame(() => {
        canvas.toBlob((blob) => {
          if (!blob) {
            setBusy(null);
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `gitchronicle-${card.kind}-${size}.png`;
          a.click();
          URL.revokeObjectURL(url);
          setBusy(null);
        }, "image/png");
      });
    },
    []
  );

  if (cards.length === 0) return null;

  const ink = theme?.ink ?? "var(--foreground)";
  const inkSoft = theme?.inkSoft ?? "var(--muted-foreground)";
  const rule = theme?.rule ?? "var(--border)";
  const inset = theme?.inset ?? "var(--muted)";

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="hidden" aria-hidden />
      <ul className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
        {cards.map((card) => (
          <li
            key={card.kind}
            className="flex flex-col gap-2 rounded-xl border p-2.5"
            style={{ borderColor: rule, background: inset }}
          >
            <CardPreview card={card} />
            <div className="min-w-0">
              <div
                className="gc-eyebrow truncate text-[0.55rem]"
                style={{ color: inkSoft }}
              >
                {card.headline}
              </div>
              <div
                className="truncate text-sm font-bold tracking-tight"
                style={{ color: ink }}
              >
                {card.stat}
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
              <Button
                size="sm"
                variant="secondary"
                className="h-8 flex-1 px-2 text-[11px]"
                disabled={busy !== null}
                onClick={() => download(card, "landscape")}
                aria-label={`Download ${card.kind} landscape card`}
                data-testid={`share-download-${card.kind}-landscape`}
              >
                <Download className="h-3.5 w-3.5" />
                1200×630
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-[11px]"
                style={{ borderColor: rule, color: ink }}
                disabled={busy !== null}
                onClick={() => download(card, "square")}
                aria-label={`Download ${card.kind} square card`}
                data-testid={`share-download-${card.kind}-square`}
              >
                1080
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Server-safe pure PNG renderer for tests — returns data URL when canvas available */
export function renderShareCardToDataUrl(
  card: WrappedShareCard,
  size: "landscape" | "square" = "landscape"
): string | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  drawCard(canvas, card, size);
  return canvas.toDataURL("image/png");
}
