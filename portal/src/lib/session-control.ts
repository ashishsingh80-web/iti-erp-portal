import { prisma } from "@/lib/prisma";

export async function forceLogoutUserSessions(userId: string) {
  const ts = new Date();
  await prisma.userSessionRevocation.upsert({
    where: { userId },
    create: { userId, invalidBefore: ts },
    update: { invalidBefore: ts }
  });
  return ts.toISOString();
}

export async function getUserInvalidBefore(userId: string) {
  const row = await prisma.userSessionRevocation.findUnique({
    where: { userId },
    select: { invalidBefore: true }
  });
  return row?.invalidBefore.toISOString() ?? null;
}
