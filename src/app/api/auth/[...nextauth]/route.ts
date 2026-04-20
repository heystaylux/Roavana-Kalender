export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { default: NextAuth } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  return (NextAuth(authOptions) as any)(req);
}

export async function POST(req: NextRequest) {
  const { default: NextAuth } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  return (NextAuth(authOptions) as any)(req);
}
