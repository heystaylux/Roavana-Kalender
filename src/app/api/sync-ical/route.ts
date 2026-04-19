// src/app/api/sync-ical/route.ts
// Cron-Job Endpoint – wird alle 15 Minuten von Vercel aufgerufen
// Geschützt durch CRON_SECRET

import { NextRequest, NextResponse } from "next/server";
import { syncAllFeeds } from "@/lib/ical-sync";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  // ── Sicherheit: CRON_SECRET prüfen ────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[CRON] iCal Sync gestartet:", new Date().toISOString());
    const result = await syncAllFeeds();
    console.log("[CRON] iCal Sync abgeschlossen:", result);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    console.error("[CRON] Sync Fehler:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Manueller Sync für einen einzelnen User
export async function POST(req: NextRequest) {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const { syncAllFeedsForUser } = await import("@/lib/ical-sync");

  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  try {
    const results = await syncAllFeedsForUser((session!.user as any).id);
    const totalAdded   = results.reduce((s, r) => s + r.added, 0);
    const totalUpdated = results.reduce((s, r) => s + r.updated, 0);
    const conflicts    = results.flatMap((r) => r.conflicts);
    const errors       = results.filter((r) => !r.success);

    return NextResponse.json({
      success: true,
      feeds: results.length,
      added: totalAdded,
      updated: totalUpdated,
      conflicts: conflicts.length,
      errors: errors.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
