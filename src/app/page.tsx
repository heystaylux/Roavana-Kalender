"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function RootPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (session) router.replace("/dashboard");
    else router.replace("/auth");
  }, [session, status, router]);

  return null;
}