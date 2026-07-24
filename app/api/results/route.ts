import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  AuthorizationError,
  requireTeacherSubscription,
} from "@/lib/auth/authorization";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function readOptionalString(
  value: unknown
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed || undefined;
}

function readRequiredString(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function readNumber(
  value: unknown
): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim()
  ) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function toJsonValue(
  value: unknown,
  fallback: Prisma.InputJsonValue
): Prisma.InputJsonValue {
  if (value === undefined) {
    return fallback;
  }

  return value as Prisma.InputJsonValue;
}

export async function GET() {
  try {
    const auth = await requireTeacherSubscription(402);

    const results =
      await prisma.assessmentResult.findMany({
        where: {
          userId: auth.user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    return Response.json(results);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error(
      "[AssessmentResultsGET] Error:",
      error
    );

    return Response.json(
      { error: "Failed to load assessment results" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireTeacherSubscription(402);

    const body: unknown = await request.json();

    if (!isRecord(body)) {
      return Response.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const transcript = readRequiredString(
      body.transcript
    );

    if (!transcript) {
      return Response.json(
        { error: "Transcript is required" },
        { status: 400 }
      );
    }

    const duration = readNumber(body.duration);

    if (duration === null || duration < 0) {
      return Response.json(
        { error: "A valid duration is required" },
        { status: 400 }
      );
    }

    const presentationType =
      readRequiredString(body.presentationType) ??
      "individual";

    const teacherFinalScore = readNumber(
      body.teacherFinalScore
    );

    if (
      teacherFinalScore !== null &&
      (teacherFinalScore < 0 ||
        teacherFinalScore > 100)
    ) {
      return Response.json(
        {
          error:
            "Teacher final score must be between 0 and 100",
        },
        { status: 400 }
      );
    }

    const groupAssessment = isRecord(
      body.groupAssessment
    )
      ? body.groupAssessment
      : {};

    const aiScore = readNumber(
      groupAssessment.overallScore
    );

    const assessmentId = readOptionalString(
      body.assessmentId
    );

    if (assessmentId) {
      const ownedAssessment =
        await prisma.assessment.findFirst({
          where: {
            id: assessmentId,
            userId: auth.user.id,
          },
          select: {
            id: true,
          },
        });

      if (!ownedAssessment) {
        return Response.json(
          {
            error:
              "Assessment not found or access denied",
          },
          { status: 404 }
        );
      }
    }

    const result =
      await prisma.assessmentResult.create({
        data: {
          userId: auth.user.id,
          assessmentId,
          presentationType,
          title:
            readOptionalString(body.title) ??
            readOptionalString(body.topic),
          grade: readOptionalString(body.grade),
          rubric: readOptionalString(body.rubric),
          topic: readOptionalString(body.topic),
          transcript,
          duration,
          aiScore,
          teacherFinalScore:
            teacherFinalScore ?? aiScore,
          teacherReviewNote:
            readOptionalString(
              body.teacherReviewNote
            ),
          studentNames: toJsonValue(
            body.studentNames,
            []
          ),
          segments: toJsonValue(
            body.segments,
            []
          ),
          detectedSpeakers: toJsonValue(
            body.detectedSpeakers,
            []
          ),
          speakerMappings: toJsonValue(
            body.speakerMappings,
            {}
          ),
          speakerStatistics: toJsonValue(
            body.speakerStatistics,
            []
          ),
          overlapWarnings: toJsonValue(
            body.overlapWarnings,
            []
          ),
          warnings: toJsonValue(
            body.warnings,
            []
          ),
          groupAssessment: toJsonValue(
            groupAssessment,
            {}
          ),
          individualResults: toJsonValue(
            body.individualAssessments,
            []
          ),
        },
      });

    console.log(
      `[AssessmentResultsPOST] Saved result ${result.id} for ${auth.user.email}`
    );

    return Response.json(
      {
        success: true,
        result,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error(
      "[AssessmentResultsPOST] Error:",
      error
    );

    return Response.json(
      { error: "Failed to save assessment result" },
      { status: 500 }
    );
  }
}