// src/app/api/stripe/subscription/route.ts
// Gibt den aktuellen Abo-Status des eingeloggten Users zurück

export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


export async function GET() {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: (session!.user as any).id },
    select: {
      subscriptionPlan:   true,
      subscriptionStatus: true,
      subscriptionEnd:    true,
      trialEnd:           true,
    } as any,
  });

  const plan   = (user as any)?.subscriptionPlan   ?? "FREE";
  const status = (user as any)?.subscriptionStatus ?? "INACTIVE";
  const end    = (user as any)?.subscriptionEnd;
  const trial  = (user as any)?.trialEnd;
  const now    = new Date();

  const isActive = status === "ACTIVE" && (!end || end > now);
  const isTrial  = trial && trial > now;

  // Plan-Limits
  const limits: Record<string, { properties: number; feeds: number; autoSync: boolean }> = {
    FREE:     { properties: 1, feeds: 2,              autoSync: false },
    STARTER:  { properties: 1, feeds: 5,              autoSync: false },
    PRO:      { properties: 5, feeds: 999,            autoSync: true  },
    BUSINESS: { properties: 999, feeds: 999,          autoSync: true  },
  };

  return NextResponse.json({
    plan,
    status,
    isActive,
    isTrial,
    trialEnd: trial,
    subscriptionEnd: end,
    limits: limits[plan] ?? limits.FREE,
  });
}
