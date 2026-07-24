import prisma from "@/lib/prisma";
import {
  AuthorizationError,
  requireTeacherSubscription,
} from "@/lib/auth/authorization";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTeacherSubscription(402);

    const { id } = await params;

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

    if (assessment.userId !== auth.user.id) {
      console.warn(
        `[DeleteAssessment] Unauthorized: user ${auth.user.id} tried to delete assessment ${id} owned by ${assessment.userId}`
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
      `[DeleteAssessment] Deleted assessment ${id} for user ${auth.user.email}`
    );
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("[DeleteAssessment] Error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
