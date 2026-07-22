import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return Response.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name || undefined,
          image: session.user.image || undefined,
          googleAccountId: (session.user as any).googleAccountId || undefined,
        },
      });
      console.log(`[GetAssessments] Created new user: ${user.id}`);
    }

    // Get all assessments for this user, newest first
    const assessments = await prisma.assessment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    console.log(`[GetAssessments] Found ${assessments.length} assessments for user ${user.email}`);
    return Response.json(assessments);
  } catch (error) {
    console.error("[GetAssessments] Error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return Response.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.title || typeof body.title !== "string") {
      return Response.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name || undefined,
          image: session.user.image || undefined,
          googleAccountId: (session.user as any).googleAccountId || undefined,
        },
      });
      console.log(`[CreateAssessment] Created new user: ${user.id}`);
    }

    // Create assessment
    const assessment = await prisma.assessment.create({
      data: {
        userId: user.id,
        title: body.title.trim(),
        activityType: body.activityType || null,
        grade: body.grade || null,
        duration: body.duration || null,
        skillFocus: body.skillFocus || null,
        rubric: body.rubric || null,
        presenterType: body.presenterType || null,
        status: "DRAFT",
      },
    });

    console.log(`[CreateAssessment] Created assessment ${assessment.id} for user ${user.email}`);
    return Response.json(assessment, { status: 201 });
  } catch (error) {
    console.error("[CreateAssessment] Error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
