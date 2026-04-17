import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  callbacks: {
    async signIn({ user }) {
      try {
        await prisma.user.upsert({
          where: { email: user.email! },
          update: { name: user.name, image: user.image },
          create: {
            email: user.email!,
            name: user.name,
            image: user.image,
          },
        });
      } catch (e) {
        console.error("signIn DB error:", e);
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          select: { id: true, onboardingDone: true },
        });
        token.userId = dbUser?.id;
        token.onboardingDone = dbUser?.onboardingDone ?? false;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId;
        (session.user as any).onboardingDone = token.onboardingDone;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth",
    newUser: "/onboarding",
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
};