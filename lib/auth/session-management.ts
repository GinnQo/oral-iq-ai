import prisma from "@/lib/prisma";

export type SessionSummary = {
  id: string;
  expires: Date;
  isCurrent: boolean;
};

export function getSessionTokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null;
  }

  const parts = cookieHeader.split(";").map((part) => part.trim());
  const plain = parts.find((part) => part.startsWith("next-auth.session-token="));
  const secure = parts.find((part) => part.startsWith("__Secure-next-auth.session-token="));
  const selected = secure ?? plain;

  if (!selected) {
    return null;
  }

  const token = selected.split("=").slice(1).join("=").trim();
  return token || null;
}

export async function listUserSessions(userId: string, currentSessionToken?: string | null): Promise<SessionSummary[]> {
  const sessions = await prisma.session.findMany({
    where: { userId },
    orderBy: { expires: "desc" },
    select: {
      id: true,
      sessionToken: true,
      expires: true,
    },
  });

  return sessions.map((session) => ({
    id: session.id,
    expires: session.expires,
    isCurrent: Boolean(currentSessionToken && currentSessionToken === session.sessionToken),
  }));
}

export async function revokeSessionById(userId: string, sessionId: string): Promise<boolean> {
  const deleted = await prisma.session.deleteMany({
    where: {
      id: sessionId,
      userId,
    },
  });

  return deleted.count > 0;
}

export async function revokeAllOtherSessions(userId: string, currentSessionToken?: string | null): Promise<number> {
  const deleted = await prisma.session.deleteMany({
    where: {
      userId,
      ...(currentSessionToken
        ? {
            NOT: {
              sessionToken: currentSessionToken,
            },
          }
        : {}),
    },
  });

  return deleted.count;
}

export async function revokeAllSessions(userId: string): Promise<number> {
  const deleted = await prisma.session.deleteMany({
    where: { userId },
  });

  return deleted.count;
}
