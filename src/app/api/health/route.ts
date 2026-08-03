import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";

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
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "unhealthy",
      },
      { status: 503 }
    );
  }
}
