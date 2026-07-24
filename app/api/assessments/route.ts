import prisma from "@/lib/prisma";
import {
  AuthorizationError,
  requireTeacherSubscription,
} from "@/lib/auth/authorization";

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export async function GET() {
  try {
    const auth = await requireTeacherSubscription(402);

    // Get all assessments for this user, newest first
    const assessments = await prisma.assessment.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: "desc" },
    });

    const linkedCourseIds = Array.from(
      new Set(
        assessments
          .map((assessment) => assessment.classroomCourseId)
          .filter((value): value is string => Boolean(value))
      )
    );

    const classrooms = linkedCourseIds.length
      ? await prisma.classroom.findMany({
          where: {
            userId: auth.user.id,
            googleCourseId: {
              in: linkedCourseIds,
            },
          },
          select: {
            googleCourseId: true,
            name: true,
          },
        })
      : [];

    const classroomNameByCourseId = new Map(
      classrooms.map((classroom) => [classroom.googleCourseId, classroom.name])
    );

    const assessmentsWithCourseName = assessments.map((assessment) => ({
      ...assessment,
      classroomCourseName: assessment.classroomCourseId
        ? classroomNameByCourseId.get(assessment.classroomCourseId) ?? null
        : null,
    }));

    console.log(`[GetAssessments] Found ${assessments.length} assessments for user ${auth.user.email}`);
    return Response.json(assessmentsWithCourseName);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("[GetAssessments] Error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireTeacherSubscription(402);

    const body = await request.json();

    const classroomCourseId = toOptionalString(body.classroomCourseId);
    const classroomCourseWorkId = toOptionalString(body.classroomCourseWorkId);
    const classroomCourseWorkTitle = toOptionalString(
      body.classroomCourseWorkTitle
    );
    const classroomAlternateLink = toOptionalString(
      body.classroomAlternateLink
    );
    const classroomMaxPoints = toOptionalNumber(body.classroomMaxPoints);
    const classroomAssociationStatus = toOptionalString(
      body.classroomAssociationStatus
    );
    const explicitTitle = toOptionalString(body.title);

    const hasClassroomLink = Boolean(
      classroomCourseId && classroomCourseWorkId
    );

    if (
      (classroomCourseId && !classroomCourseWorkId) ||
      (!classroomCourseId && classroomCourseWorkId)
    ) {
      return Response.json(
        {
          error:
            "Both classroomCourseId and classroomCourseWorkId are required when linking a Google Classroom assignment.",
        },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!explicitTitle && !classroomCourseWorkTitle) {
      return Response.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (hasClassroomLink) {
      const existingAssessment = await prisma.assessment.findFirst({
        where: {
          userId: auth.user.id,
          classroomCourseId,
          classroomCourseWorkId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (existingAssessment) {
        console.log(
          `[CreateAssessment] Existing linked assessment ${existingAssessment.id} returned for coursework ${classroomCourseWorkId}`
        );

        return Response.json(existingAssessment, { status: 200 });
      }
    }

    // Create assessment
    const assessment = await prisma.assessment.create({
      data: {
        userId: auth.user.id,
        title: explicitTitle ?? classroomCourseWorkTitle ?? "Untitled Assessment",
        activityType: body.activityType || null,
        grade: body.grade || null,
        duration: body.duration || null,
        skillFocus: body.skillFocus || null,
        rubric: body.rubric || null,
        presenterType: body.presenterType || null,
        classroomCourseId: hasClassroomLink ? classroomCourseId : null,
        classroomCourseWorkId: hasClassroomLink ? classroomCourseWorkId : null,
        classroomCourseWorkTitle:
          hasClassroomLink && classroomCourseWorkTitle
            ? classroomCourseWorkTitle
            : null,
        classroomAlternateLink:
          hasClassroomLink && classroomAlternateLink
            ? classroomAlternateLink
            : null,
        classroomMaxPoints: hasClassroomLink ? classroomMaxPoints : null,
        classroomAssociationStatus: hasClassroomLink
          ? classroomAssociationStatus ?? "LINKED"
          : null,
        classroomLinkedAt: hasClassroomLink ? new Date() : null,
        status: "DRAFT",
      },
    });

    console.log(`[CreateAssessment] Created assessment ${assessment.id} for user ${auth.user.email}`);
    return Response.json(assessment, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("[CreateAssessment] Error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
