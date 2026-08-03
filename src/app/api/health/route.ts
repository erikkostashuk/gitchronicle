import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    getDb();
    return NextResponse.json({
      ok: true,
      service: "gitchronicle",
      ts: new Date().toISOString(),
    });
  } catch (err) {
    // The probe is public, so the body stays generic — a database failure
    // message carries the absolute path of the data directory. Detail is
    // logged for the operator instead.
    logger.error("Health check failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { ok: false, service: "gitchronicle", error: "unhealthy" },
      { status: 503 }
    );
  }
}
