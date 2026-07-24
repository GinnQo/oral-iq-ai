import { NextResponse } from "next/server";
import {
  AuthorizationError,
  requireAuthenticatedUser,
} from "@/lib/auth/authorization";
import { revokeSessionById } from "@/lib/auth/session-management";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuthenticatedUser();
    const { id } = await params;

    if (!id?.trim()) {
      return NextResponse.json(
        { error: "Session id is required" },
        { status: 400 }
      );
    }

    const revoked = await revokeSessionById(auth.user.id, id);

    if (!revoked) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
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
