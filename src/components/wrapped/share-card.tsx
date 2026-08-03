"use client";

import { useCallback, useRef, useState } from "react";
import type { WrappedShareCard } from "@/lib/wrapped";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const PALETTE = {
  bg0: "#0a0a0a",
  bg1: "#121212",
  accent: "#1ed760",
  accent2: "#1db954",
  text: "#ffffff",
  muted: "#b3b3b3",
};

function drawCard(
  canvas: HTMLCanvasElement,
  card: WrappedShareCard,
  size: "landscape" | "square"
) {
  const w = size === "landscape" ? 1200 : 1080;
  const h = size === "landscape" ? 630 : 1080;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background gradient — Spotify-adjacent dark shell
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, PALETTE.bg0);
  g.addColorStop(0.45, "#121212");
  g.addColorStop(1, "#0d1f14");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Soft green orbs
  const orb = (x: number, y: number, r: number, color: string) => {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, color);
    rg.addColorStop(1, "transparent");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, h);
  };
  orb(w * 0.15, h * 0.2, w * 0.4, "rgba(30,215,96,0.28)");
  orb(w * 0.85, h * 0.75, w * 0.45, "rgba(29,185,84,0.22)");

  // Grain-ish dots (light)
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  for (let i = 0; i < 80; i++) {
    const x = (i * 97) % w;
    const y = (i * 53) % h;
    ctx.fillRect(x, y, 2, 2);
  }

  const pad = size === "landscape" ? 72 : 80;
  ctx.fillStyle = PALETTE.accent;
  ctx.font = "600 22px system-ui, sans-serif";
  ctx.fillText("GITCHRONICLE WRAPPED", pad, pad + 8);

  ctx.fillStyle = PALETTE.muted;
  ctx.font = "500 28px system-ui, sans-serif";
  ctx.fillText(card.repoName, pad, pad + 56);

  ctx.fillStyle = PALETTE.muted;
  ctx.font = "500 24px system-ui, sans-serif";
  ctx.fillText(card.headline, pad, pad + 120);

  // Hero stat — wrap if long
  ctx.fillStyle = PALETTE.text;
  const hero = card.stat;
  const heroSize = hero.length > 24 ? 48 : hero.length > 12 ? 64 : 96;
  ctx.font = `700 ${heroSize}px system-ui, sans-serif`;
  const lines = wrapText(ctx, hero, w - pad * 2);
  let y = pad + 200;
  for (const line of lines.slice(0, 3)) {
    ctx.fillText(line, pad, y);
    y += heroSize + 8;
  }

  ctx.fillStyle = PALETTE.muted;
  ctx.font = "400 28px system-ui, sans-serif";
  const detailLines = wrapText(ctx, card.detail, w - pad * 2);
  y += 24;
  for (const line of detailLines.slice(0, 3)) {
    ctx.fillText(line, pad, y);
    y += 36;
  }

  // Brand bar
  ctx.fillStyle = PALETTE.accent;
  ctx.fillRect(pad, h - pad - 4, 64, 4);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = "500 18px system-ui, sans-serif";
  ctx.fillText("gitchronicle · watch a codebase become itself", pad, h - pad + 28);
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

export function ShareCardDownloader({
  cards,
}: {
  cards: WrappedShareCard[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const download = useCallback(
    (card: WrappedShareCard, size: "landscape" | "square") => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      setBusy(`${card.kind}-${size}`);
      drawCard(canvas, card, size);
      // next frame ensures paint
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

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="hidden" aria-hidden />
      <ul className="grid gap-2 sm:grid-cols-2">
        {cards.map((card) => (
          <li
            key={card.kind}
            className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wide text-white/50">
                {card.headline}
              </div>
              <div className="truncate font-semibold text-white">{card.stat}</div>
              <div className="truncate text-xs text-white/60">{card.detail}</div>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                size="sm"
                variant="secondary"
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
                className="border-white/20 bg-transparent text-white hover:bg-white/10"
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

/** Server-safe pure PNG renderer for tests — returns data URL length > 0 when canvas available */
export function renderShareCardToDataUrl(
  card: WrappedShareCard,
  size: "landscape" | "square" = "landscape"
): string | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  drawCard(canvas, card, size);
  return canvas.toDataURL("image/png");
}
