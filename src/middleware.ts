// src/middleware.ts
// Schützt /dashboard und /onboarding – leitet nicht-angemeldete User zu /auth weiter

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Onboarding erzwingen wenn noch nicht abgeschlossen
    if (pathname.startsWith("/dashboard") && token && !(token as any).onboardingDone) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding"],
};
