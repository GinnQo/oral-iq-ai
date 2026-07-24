import { NextResponse } from "next/server";
import {
  AuthorizationError,
  requireAuthenticatedUser,
  requireSubscription,
} from "@/lib/auth/authorization";
import {
  getGoogleAccessTokenForUser,
  GoogleReconnectRequiredError,
} from "@/lib/auth/google-tokens";

export async function GET() {
  try {
    const auth = await requireAuthenticatedUser();
    await requireSubscription(auth, 402);

    const token = await getGoogleAccessTokenForUser(auth.user.id);

    return NextResponse.json({
      accessToken: token.accessToken,
      expiresAt: token.expiresAt,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof GoogleReconnectRequiredError) {
      return NextResponse.json(
        {
          error: "Google authorization expired. Please sign out and sign in again.",
          reconnectRequired: true,
        },
        { status: 401 }
      );
    }

    console.error("[GoogleTokenRoute] Error", {
      category: "google-token-failure",
    });

    return NextResponse.json({ error: "Unable to retrieve Google token" }, { status: 500 });
  }
}
