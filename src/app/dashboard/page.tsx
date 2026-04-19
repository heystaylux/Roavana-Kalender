export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) redirect("/auth");

  const userId = (session!.user as any).id;

  try {
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

    const bookingsMapped = bookings.map(b => ({
      ...b,
      checkIn: b.checkIn.toISOString().split("T")[0],
      checkOut: b.checkOut.toISOString().split("T")[0],
      platform: b.platform as string,
      status: b.status as string,
    }));

    const feedsMapped = icalFeeds.map(f => ({
      ...f,
      status: f.status as string,
      lastSynced: f.lastSynced?.toISOString() ?? null,
      platform: f.platform as string,
    }));

    return (
      <DashboardClient
        user={user}
        initialProperties={properties}
        initialBookings={bookingsMapped as any}
        initialFeeds={feedsMapped as any}
      />
    );
  } catch (e) {
    redirect("/auth");
  }
}