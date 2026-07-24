import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { requireSubscriptionAccess } from "@/lib/subscription-access";
import { hasTeacherSubscriptionBypass } from "@/lib/auth/platform-access";

export type AppUserRole =
  | "SUPER_ADMIN"
  | "SCHOOL_ADMIN"
  | "TEACHER"
  | "STUDENT"
  | "ADMIN";

export class AuthorizationError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}

export type AuthenticatedUserContext = {
  session: Session;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: AppUserRole;
    schoolId: string | null;
  };
};

export type AuthorizedContext = AuthenticatedUserContext & {
  subscription: {
    canAccess: boolean;
    plan: string;
    ownerType: string;
  };
};

function normalizeRole(rawRole: string | null | undefined): AppUserRole {
  if (
    rawRole === "SUPER_ADMIN" ||
    rawRole === "SCHOOL_ADMIN" ||
    rawRole === "TEACHER" ||
    rawRole === "STUDENT" ||
    rawRole === "ADMIN"
  ) {
    return rawRole;
  }

  return "TEACHER";
}

export async function requireAuthenticatedUser(): Promise<AuthenticatedUserContext> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new AuthorizationError("Not authenticated", 401);
  }

  const sessionUserId = session.user.id?.trim();
  const email = session.user.email.trim().toLowerCase();
  const user = sessionUserId
    ? await prisma.user.findUnique({
        where: { id: sessionUserId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          schoolId: true,
        },
      })
    : await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          schoolId: true,
        },
      });

  if (!user) {
    throw new AuthorizationError("User account not found", 401);
  }

  return {
    session,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: normalizeRole(user.role as string),
      schoolId: user.schoolId,
    },
  };
}

export function requireRole(
  context: AuthenticatedUserContext,
  role: AppUserRole
): AuthenticatedUserContext {
  if (context.user.role !== role) {
    throw new AuthorizationError("Forbidden", 403);
  }

  return context;
}

export function requireAnyRole(
  context: AuthenticatedUserContext,
  roles: AppUserRole[]
): AuthenticatedUserContext {
  if (!roles.includes(context.user.role)) {
    throw new AuthorizationError("Forbidden", 403);
  }

  return context;
}

export function requireTeacher(
  context: AuthenticatedUserContext
): AuthenticatedUserContext {
  return requireAnyRole(context, [
    "TEACHER",
    "SCHOOL_ADMIN",
    "SUPER_ADMIN",
    "ADMIN",
  ]);
}

export function requireSchoolAdmin(
  context: AuthenticatedUserContext
): AuthenticatedUserContext {
  return requireAnyRole(context, [
    "SCHOOL_ADMIN",
    "SUPER_ADMIN",
    "ADMIN",
  ]);
}

export function requireSuperAdmin(
  context: AuthenticatedUserContext
): AuthenticatedUserContext {
  return requireAnyRole(context, ["SUPER_ADMIN"]);
}

export async function requireSubscription(
  context: AuthenticatedUserContext,
  statusCode = 402
): Promise<AuthorizedContext> {
  if (hasTeacherSubscriptionBypass(context.user.email)) {
    const billing = await requireSubscriptionAccess();

    if (billing && billing.user.id !== context.user.id) {
      throw new AuthorizationError("Forbidden", 403);
    }

    return {
      ...context,
      subscription: {
        canAccess: true,
        plan: billing?.plan ?? "FREE",
        ownerType: billing?.ownerType ?? "user",
      },
    };
  }

  const billing = await requireSubscriptionAccess();

  if (!billing) {
    throw new AuthorizationError("Not authenticated", 401);
  }

  if (billing.user.id !== context.user.id) {
    throw new AuthorizationError("Forbidden", 403);
  }

  if (!billing.canAccess) {
    throw new AuthorizationError("Subscription required", statusCode);
  }

  return {
    ...context,
    subscription: {
      canAccess: billing.canAccess,
      plan: billing.plan,
      ownerType: billing.ownerType,
    },
  };
}

export async function requireTeacherSubscription(
  statusCode = 402
): Promise<AuthorizedContext> {
  const auth = await requireAuthenticatedUser();

  if (hasTeacherSubscriptionBypass(auth.user.email)) {
    return requireSubscription(auth, statusCode);
  }

  requireTeacher(auth);
  return requireSubscription(auth, statusCode);
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthorizationError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  return Response.json({ error: "Internal server error" }, { status: 500 });
}
