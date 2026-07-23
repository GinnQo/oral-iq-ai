import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireSubscriptionAccess } from "@/lib/subscription-access";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return Response.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const access = await requireSubscriptionAccess();

    if (!access?.canAccess) {
      return Response.json(
        { error: "Subscription required" },
        { status: 402 }
      );
    }

    const { id } = await params;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return Response.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Find assessment and verify ownership
    const assessment = await prisma.assessment.findUnique({
      where: { id },
    });

    if (!assessment) {
      return Response.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    if (assessment.userId !== user.id) {
      console.warn(
        `[DeleteAssessment] Unauthorized: user ${user.id} tried to delete assessment ${id} owned by ${assessment.userId}`
      );
      return Response.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Delete assessment
    await prisma.assessment.delete({
      where: { id },
    });

    console.log(
      `[DeleteAssessment] Deleted assessment ${id} for user ${user.email}`
    );
    return Response.json({ success: true });
  } catch (error) {
    console.error("[DeleteAssessment] Error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
