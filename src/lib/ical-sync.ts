// src/lib/ical-sync.ts
// Kern-Engine: iCal Feeds abrufen, parsen, auf Konflikte prüfen, in DB speichern

import ical from "node-ical";
import { prisma } from "./prisma";
import { Platform, BookingStatus } from "@prisma/client";

// ─── TYPEN ────────────────────────────────────────────────────────────────────

export interface SyncResult {
  feedId: string;
  success: boolean;
  added: number;
  updated: number;
  errors: string[];
  conflicts: ConflictInfo[];
}

export interface ConflictInfo {
  existingBookingId: string;
  newUid: string;
  propertyId: string;
  checkIn: Date;
  checkOut: Date;
  existingPlatform: string;
  newPlatform: string;
}

// ─── EINEN FEED SYNCHRONISIEREN ───────────────────────────────────────────────

export async function syncIcalFeed(feedId: string): Promise<SyncResult> {
  const result: SyncResult = {
    feedId,
    success: false,
    added: 0,
    updated: 0,
    errors: [],
    conflicts: [],
  };

  // Feed aus DB laden
  const feed = await prisma.icalFeed.findUnique({
    where: { id: feedId },
    include: { property: true },
  });

  if (!feed) {
    result.errors.push("Feed nicht gefunden");
    return result;
  }

  // Status: Syncing
  await prisma.icalFeed.update({
    where: { id: feedId },
    data: { status: "SYNCING" },
  });

  try {
    // ── iCal abrufen & parsen ─────────────────────────────────────────────
    const events = await ical.async.fromURL(feed.url);

    for (const [, event] of Object.entries(events)) {
      // Nur VEVENT-Einträge (keine VTIMEZONE etc.)
      if (event.type !== "VEVENT") continue;

      const uid = event.uid;
      const checkIn = event.start instanceof Date ? event.start : new Date(event.start as string);
      const checkOut = event.end instanceof Date ? event.end : new Date(event.end as string);

      // Ungültige Daten überspringen
      if (!checkIn || !checkOut || checkIn >= checkOut) continue;

      // Gastname aus Summary extrahieren (Airbnb/Booking format)
      const guestName = extractGuestName(event.summary as string || "");

      // ── Konflikt-Prüfung ──────────────────────────────────────────────
      const conflicting = await prisma.booking.findFirst({
        where: {
          propertyId: feed.propertyId,
          // NICHT dieselbe Buchung (gleicher Feed + UID)
          NOT: { feedId: feed.id, uid: uid },
          // Datum-Überlappung: checkIn < andereCheckOut UND andereCheckIn < checkOut
          AND: [
            { checkIn: { lt: checkOut } },
            { checkOut: { gt: checkIn } },
          ],
          status: { not: "CANCELLED" },
        },
      });

      if (conflicting) {
        result.conflicts.push({
          existingBookingId: conflicting.id,
          newUid: uid,
          propertyId: feed.propertyId,
          checkIn,
          checkOut,
          existingPlatform: conflicting.platform,
          newPlatform: feed.platform,
        });
        // Konflikt-Benachrichtigung senden
        await notifyConflict(feed.userId, conflicting, feed, checkIn, checkOut);
        continue; // Buchung NICHT speichern
      }

      // ── Upsert: Erstellen oder Aktualisieren ──────────────────────────
      const existing = await prisma.booking.findUnique({
        where: { feedId_uid: { feedId: feed.id, uid } },
      });

      if (existing) {
        await prisma.booking.update({
          where: { id: existing.id },
          data: { checkIn, checkOut, guestName, status: "CONFIRMED", updatedAt: new Date() },
        });
        result.updated++;
      } else {
        await prisma.booking.create({
          data: {
            userId: feed.userId,
            propertyId: feed.propertyId,
            feedId: feed.id,
            uid,
            platform: feed.platform,
            guestName,
            checkIn,
            checkOut,
            status: "CONFIRMED",
            source: "ICAL",
          },
        });
        result.added++;
      }
    }

    // ── Feed-Status auf OK setzen ─────────────────────────────────────────
    await prisma.icalFeed.update({
      where: { id: feedId },
      data: { status: "OK", lastSynced: new Date(), lastError: null },
    });

    result.success = true;
  } catch (error: any) {
    const errMsg = error?.message ?? "Unbekannter Fehler";
    result.errors.push(errMsg);

    await prisma.icalFeed.update({
      where: { id: feedId },
      data: { status: "ERROR", lastError: errMsg },
    });
  }

  return result;
}

// ─── ALLE FEEDS EINES USERS SYNCHRONISIEREN ───────────────────────────────────

export async function syncAllFeedsForUser(userId: string): Promise<SyncResult[]> {
  const feeds = await prisma.icalFeed.findMany({
    where: { userId, status: { not: "SYNCING" } },
    select: { id: true },
  });

  const results = await Promise.allSettled(
    feeds.map((f) => syncIcalFeed(f.id))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<SyncResult> => r.status === "fulfilled")
    .map((r) => r.value);
}

// ─── ALLE FEEDS (CRON) ────────────────────────────────────────────────────────

export async function syncAllFeeds(): Promise<{ total: number; ok: number; errors: number }> {
  const feeds = await prisma.icalFeed.findMany({
    where: { status: { not: "SYNCING" } },
    select: { id: true },
  });

  let ok = 0, errors = 0;

  // In Batches von 10 – Server nicht überlasten
  const batchSize = 10;
  for (let i = 0; i < feeds.length; i += batchSize) {
    const batch = feeds.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map((f) => syncIcalFeed(f.id)));
    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value.success) ok++;
      else errors++;
    });
  }

  return { total: feeds.length, ok, errors };
}

// ─── HILFSFUNKTIONEN ──────────────────────────────────────────────────────────

function extractGuestName(summary: string): string {
  // Airbnb: "Reserved" oder "Airbnb (Vorname N.)"
  // Booking: "CLOSED - Nicht verfügbar" oder Gastname
  if (!summary) return "Gast";
  const cleaned = summary
    .replace(/^(CLOSED\s*[-–]?\s*)/i, "")
    .replace(/^(Reserved|Airbnb)\s*/i, "")
    .trim();
  return cleaned || "Gast";
}

async function notifyConflict(
  userId: string,
  existing: any,
  feed: any,
  newCheckIn: Date,
  newCheckOut: Date
) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (!user?.email) return;

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const fmt = (d: Date) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

    await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: user.email,
      subject: "⚠️ Doppelbuchung erkannt – Roavana.Kalender",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0E0F0D;color:#F2EDE4;padding:40px;border-radius:16px">
          <h1 style="color:#D96B5B;font-size:22px">⚠️ Doppelbuchung erkannt</h1>
          <p style="color:#BDB7AC;margin:16px 0">Eine neue Buchung überschneidet sich mit einer bestehenden:</p>
          <div style="background:#1E201B;border-radius:10px;padding:16px;margin:16px 0">
            <p style="color:#C8A96E;margin:0 0 8px"><strong>Bestehend (${existing.platform}):</strong></p>
            <p style="color:#F2EDE4;margin:0">${fmt(existing.checkIn)} → ${fmt(existing.checkOut)}</p>
          </div>
          <div style="background:#1E201B;border-radius:10px;padding:16px;margin:16px 0">
            <p style="color:#D96B5B;margin:0 0 8px"><strong>Neu erkannt (${feed.platform}):</strong></p>
            <p style="color:#F2EDE4;margin:0">${fmt(newCheckIn)} → ${fmt(newCheckOut)}</p>
          </div>
          <p style="color:#BDB7AC">Die neue Buchung wurde <strong style="color:#D96B5B">nicht gespeichert</strong>. Bitte handle sofort auf deiner Plattform.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
             style="display:inline-block;margin-top:20px;padding:12px 24px;background:#C8A96E;color:#0E0F0D;border-radius:8px;text-decoration:none;font-weight:600">
            Dashboard öffnen →
          </a>
        </div>
      `,
    });
  } catch (e) {
    console.error("Conflict notification failed:", e);
  }
}
