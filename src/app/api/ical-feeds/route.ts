// src/app/api/ical-feeds/route.ts
// CRUD für iCal-Feeds

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateFeedSchema = z.object({
  propertyId: z.string().min(1),
  name: z.string().min(1).max(100),
  url: z.string().url("Ungültige URL").refine((u) => u.includes(".ics"), "URL muss auf .ics enden"),
  platform: z.enum(["AIRBNB", "BOOKING", "TRAUMFERIENWOHNUNG", "OTHER"]),
});

// GET: Alle Feeds des Users
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const feeds = await prisma.icalFeed.findMany({
    where: { userId: (session!.user as any).id },
    include: { property: { select: { name: true, emoji: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(feeds);
}

// POST: Neuen Feed erstellen + sofort syncen
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateFeedSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Sicherstellen dass das Objekt dem User gehört
  const property = await prisma.property.findFirst({
    where: { id: parsed.data.propertyId, userId: (session!.user as any).id },
  });
  if (!property) return NextResponse.json({ error: "Objekt nicht gefunden" }, { status: 404 });

  const feed = await prisma.icalFeed.create({
    data: {
      userId: (session!.user as any).id,
      propertyId: parsed.data.propertyId,
      name: parsed.data.name,
      url: parsed.data.url,
      platform: parsed.data.platform,
    },
  });

  // Sofort syncen (non-blocking)
  import("@/lib/ical-sync").then(({ syncIcalFeed }) => syncIcalFeed(feed.id)).catch(console.error);

  return NextResponse.json(feed, { status: 201 });
}

// DELETE: Feed löschen
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const feedId = searchParams.get("id");
  if (!feedId) return NextResponse.json({ error: "Feed-ID fehlt" }, { status: 400 });

  await prisma.icalFeed.deleteMany({
    where: { id: feedId, userId: (session!.user as any).id },
  });

  return NextResponse.json({ success: true });
}
