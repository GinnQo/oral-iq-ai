import { NextResponse } from "next/server";
import {
  AuthorizationError,
  requireAuthenticatedUser,
} from "@/lib/auth/authorization";
import {
  getSessionTokenFromCookieHeader,
  listUserSessions,
  revokeAllOtherSessions,
  revokeAllSessions,
} from "@/lib/auth/session-management";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser();
    const currentSessionToken = getSessionTokenFromCookieHeader(
      request.headers.get("cookie")
    );
    const sessions = await listUserSessions(auth.user.id, currentSessionToken);

    return NextResponse.json({
      sessions,
      total: sessions.length,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuthenticatedUser();
    const currentSessionToken = getSessionTokenFromCookieHeader(
      request.headers.get("cookie")
    );
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") ?? "others";

    if (scope !== "others" && scope !== "all") {
      return NextResponse.json(
        { error: "Invalid scope. Use 'others' or 'all'." },
        { status: 400 }
      );
    }

    const revokedCount =
      scope === "all"
        ? await revokeAllSessions(auth.user.id)
        : await revokeAllOtherSessions(auth.user.id, currentSessionToken);

    return NextResponse.json({
      revokedCount,
      scope,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
