// src/app/dashboard/page.tsx
// Hauptseite nach dem Login – zeigt den Roavana.Kalender

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth");

  const userId = (session.user as any).id;

  // Daten serverseitig laden
  const [properties, bookings, icalFeeds, user] = await Promise.all([
    prisma.property.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.booking.findMany({
      where: { userId, status: { not: "CANCELLED" } },
      include: { property: { select: { name: true, emoji: true } } },
      orderBy: { checkIn: "asc" },
    }),
    prisma.icalFeed.findMany({
      where: { userId },
      include: { property: { select: { name: true, emoji: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        image: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        trialEnd: true,
      } as any,
    }),
  ]);

  return (
    <DashboardClient
      user={user}
      initialProperties={properties}
      initialBookings={bookings}
      initialFeeds={icalFeeds}
    />
  );
}
