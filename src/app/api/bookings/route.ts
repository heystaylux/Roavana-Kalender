// src/app/api/bookings/route.ts
// Buchungen CRUD

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
export const dynamic = "force-dynamic";

const CreateBookingSchema = z.object({
  propertyId: z.string().min(1),
  guestName: z.string().min(1).max(100),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(50).default(1),
  revenue: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
  platform: z.enum(["AIRBNB", "BOOKING", "TRAUMFERIENWOHNUNG", "MANUAL"]).default("MANUAL"),
});

// GET: Buchungen abrufen (optional nach PropertyId filtern)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("propertyId");

  const bookings = await prisma.booking.findMany({
    where: {
      userId: (session!.user as any).id,
      status: { not: "CANCELLED" },
      ...(propertyId ? { propertyId } : {}),
    },
    include: { property: { select: { name: true, emoji: true } } },
    orderBy: { checkIn: "asc" },
  });

  return NextResponse.json(bookings);
}

// POST: Manuelle Buchung erstellen
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateBookingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { propertyId, guestName, checkIn, checkOut, guests, revenue, notes, platform } = parsed.data;
  const checkInDate  = new Date(checkIn  + "T12:00:00Z");
  const checkOutDate = new Date(checkOut + "T12:00:00Z");

  if (checkInDate >= checkOutDate) {
    return NextResponse.json({ error: "Check-out muss nach Check-in liegen" }, { status: 400 });
  }

  // Objekt-Ownership prüfen
  const property = await prisma.property.findFirst({
    where: { id: propertyId, userId: (session!.user as any).id },
  });
  if (!property) return NextResponse.json({ error: "Objekt nicht gefunden" }, { status: 404 });

  // ── Konflikt-Prüfung ─────────────────────────────────────────────────────
  const conflict = await prisma.booking.findFirst({
    where: {
      propertyId,
      status: { not: "CANCELLED" },
      AND: [
        { checkIn: { lt: checkOutDate } },
        { checkOut: { gt: checkInDate } },
      ],
    },
    include: { property: { select: { name: true } } },
  });

  if (conflict) {
    return NextResponse.json({
      error: "CONFLICT",
      message: `Doppelbuchung! Überschneidung mit bestehender Buchung (${
        conflict.checkIn.toLocaleDateString("de-DE")
      } – ${conflict.checkOut.toLocaleDateString("de-DE")})`,
      conflictId: conflict.id,
    }, { status: 409 });
  }

  const booking = await prisma.booking.create({
    data: {
      userId: (session!.user as any).id,
      propertyId,
      guestName,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests,
      revenue,
      notes,
      platform,
      source: "MANUAL",
    },
  });

  return NextResponse.json(booking, { status: 201 });
}
