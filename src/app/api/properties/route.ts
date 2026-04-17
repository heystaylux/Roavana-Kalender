// src/app/api/properties/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Schema = z.object({
  name:    z.string().min(1).max(100),
  address: z.string().min(1).max(200),
  city:    z.string().optional(),
  country: z.string().optional(),
  emoji:   z.string().default("🏠"),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const properties = await prisma.property.findMany({
    where: { userId: (session.user as any).id },
    include: {
      _count: { select: { bookings: true, icalFeeds: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(properties);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const property = await prisma.property.create({
    data: { userId: (session.user as any).id, ...parsed.data },
  });

  return NextResponse.json(property, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID fehlt" }, { status: 400 });
  await prisma.property.deleteMany({ where: { id, userId: (session.user as any).id } });
  return NextResponse.json({ success: true });
}