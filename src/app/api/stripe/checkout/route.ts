// src/app/api/stripe/checkout/route.ts
// Erstellt eine Stripe Checkout Session für ein Abo

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-03-25.dahlia" });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { priceId, plan } = await req.json();
  if (!priceId) return NextResponse.json({ error: "priceId fehlt" }, { status: 400 });

  const userId = (session!.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });

  // Stripe Customer erstellen oder laden
  let customerId = (user as any).stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      name: user.name ?? undefined,
      metadata: { userId },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customerId } as any,
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,         // 14 Tage kostenlos
      metadata: { userId, plan },
    },
    success_url: `${appUrl}/dashboard?upgraded=true&plan=${plan}`,
    cancel_url:  `${appUrl}/pricing?cancelled=true`,
    locale: "de",
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    customer_update: { address: "auto" },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
