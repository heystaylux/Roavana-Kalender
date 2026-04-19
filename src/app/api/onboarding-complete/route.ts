// src/app/api/onboarding-complete/route.ts

export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  await prisma.user.update({
    where: { id: (session!.user as any).id },
    data: { onboardingDone: true },
  });

  return NextResponse.json({ success: true });
}
