import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  });
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_, prop) {
    const client = (globalForPrisma.prisma ??= createClient());
    return (client as any)[prop];
  },
});
