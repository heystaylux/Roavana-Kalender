export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-03-25.dahlia" });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: (session!.user as any).id } });
  const customerId = (user as any)?.stripeCustomerId;

  if (!customerId) {
    return NextResponse.json({ error: "Kein Stripe-Konto gefunden" }, { status: 400 });
  }

  const stripe = getStripe();

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  });

  return NextResponse.json({ url: portalSession.url });
}
