export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-03-25.dahlia" });
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  const body = await req.text();
  const sig  = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook Signatur ungültig:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const userId = subscription.metadata?.userId;
        if (!userId) break;
        await upsertSubscription(stripe, userId, subscription);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (!userId) break;
        await upsertSubscription(stripe, userId, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (!userId) break;
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionStatus: "CANCELLED",
            subscriptionPlan:   "FREE",
            subscriptionEnd:    new Date(),
          } as any,
        });
        await sendSubscriptionEmail(userId, "cancelled");
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId } as any,
        });
        if (user) await sendSubscriptionEmail(user.id, "payment_failed");
        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (userId) await sendSubscriptionEmail(userId, "trial_ending");
        break;
      }
    }
  } catch (err) {
    console.error("Webhook Handler Fehler:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function upsertSubscription(stripe: Stripe, userId: string, sub: Stripe.Subscription) {
  const priceId = sub.items.data[0]?.price.id;
  const plan    = getPlanFromPriceId(priceId);
  const status  = sub.status === "active" || sub.status === "trialing" ? "ACTIVE" : "CANCELLED";

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionId:     sub.id,
      subscriptionPlan:   plan,
      subscriptionStatus: status,
      subscriptionEnd:    new Date(((sub as any).current_period_end) * 1000),
      trialEnd:           (sub as any).trial_end ? new Date((sub as any).trial_end * 1000) : null,
    } as any,
  });
}

function getPlanFromPriceId(priceId?: string): string {
  if (!priceId) return "FREE";
  const map: Record<string, string> = {
    [process.env.STRIPE_PRICE_STARTER!]: "STARTER",
    [process.env.STRIPE_PRICE_PRO!]:     "PRO",
    [process.env.STRIPE_PRICE_BUSINESS!]:"BUSINESS",
  };
  return map[priceId] ?? "FREE";
}

async function sendSubscriptionEmail(userId: string, type: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (!user?.email) return;

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

    const templates: Record<string, { subject: string; body: string }> = {
      cancelled: {
        subject: "Dein Roavana.Kalender Abo wurde beendet",
        body: `<p>Schade, dass du gehst! Du kannst jederzeit unter <a href="${appUrl}/pricing">roavana.de/pricing</a> wieder abonnieren.</p>`,
      },
      payment_failed: {
        subject: "⚠️ Zahlung fehlgeschlagen – Roavana.Kalender",
        body: `<p>Deine letzte Zahlung konnte nicht verarbeitet werden. Bitte aktualisiere deine Zahlungsmethode unter <a href="${appUrl}/dashboard">Abo verwalten</a>.</p>`,
      },
      trial_ending: {
        subject: "⏰ Dein Testzeitraum endet in 3 Tagen",
        body: `<p>Deine 14-tägige Testphase endet bald. Wechsle jetzt zu einem bezahlten Plan unter <a href="${appUrl}/pricing">roavana.de/pricing</a>.</p>`,
      },
    };

    const t = templates[type];
    if (!t) return;

    await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: user.email,
      subject: t.subject,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0E0F0D;color:#F2EDE4;padding:40px;border-radius:16px">
          <h2 style="font-family:Georgia,serif;color:#C8A96E">Roavana.Kalender</h2>
          ${t.body}
          <p style="margin-top:32px;font-size:12px;color:rgba(255,255,255,0.2)">Roavana Travel GbR · Arthur-Pollack Straße 14, 01796 Pirna</p>
        </div>`,
    });
  } catch (e) {
    console.error("Subscription email failed:", e);
  }
}
