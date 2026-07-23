import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { requireSubscriptionAccess } from "@/lib/subscription-access";

type ImportedCourse = {
  id: string;
  name: string;
  section?: string;
  room?: string;
};

type ImportedStudent = {
  id: string;
  name: string;
  email?: string;
};

type ImportRequestBody = {
  course: ImportedCourse;
  students: ImportedStudent[];
};

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeEmail(value?: string) {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

async function getCurrentUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return null;
  }

  const access = await requireSubscriptionAccess();

  if (!access?.canAccess) {
    return null;
  }

  const email = session.user.email.trim().toLowerCase();

  return prisma.user.upsert({
    where: {
      email,
    },
    update: {
      name: session.user.name?.trim() || undefined,
      image: session.user.image || undefined,
    },
    create: {
      email,
      name: session.user.name?.trim() || undefined,
      image: session.user.image || undefined,
    },
  });
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const classroom = await prisma.classroom.findFirst({
      where: {
        userId: user.id,
        active: true,
      },
      orderBy: {
        lastSyncedAt: "desc",
      },
      include: {
        enrollments: {
          where: {
            status: "ACTIVE",
          },
          include: {
            student: true,
          },
        },
      },
    });

    if (!classroom) {
      return Response.json({
        classroom: null,
        students: [],
      });
    }

    const students = classroom.enrollments
      .map((enrollment) => ({
        id: enrollment.student.googleStudentId,
        name: enrollment.student.name,
        email: enrollment.student.email ?? undefined,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return Response.json({
      classroom: {
        id: classroom.googleCourseId,
        name: classroom.name,
        section: classroom.section ?? undefined,
        room: classroom.room ?? undefined,
      },
      students,
    });
  } catch (error) {
    console.error("[ClassroomImportGET] Error:", error);

    return Response.json(
      { error: "Failed to load saved classroom" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as ImportRequestBody;

    const courseId =
      typeof body?.course?.id === "string"
        ? body.course.id.trim()
        : "";

    const courseName =
      typeof body?.course?.name === "string"
        ? body.course.name.trim()
        : "";

    if (!courseId || !courseName) {
      return Response.json(
        {
          error:
            "A valid course ID and course name are required",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.students)) {
      return Response.json(
        { error: "Students must be an array" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const classroom = await tx.classroom.upsert({
          where: {
            userId_googleCourseId: {
              userId: user.id,
              googleCourseId: courseId,
            },
          },
          update: {
            name: courseName,
            section: normalizeOptionalText(
              body.course.section
            ),
            room: normalizeOptionalText(
              body.course.room
            ),
            active: true,
            lastSyncedAt: new Date(),
          },
          create: {
            userId: user.id,
            googleCourseId: courseId,
            name: courseName,
            section: normalizeOptionalText(
              body.course.section
            ),
            room: normalizeOptionalText(
              body.course.room
            ),
            active: true,
            lastSyncedAt: new Date(),
          },
        });

        const importedStudentIds: string[] = [];

        for (const incomingStudent of body.students) {
          const googleStudentId =
            typeof incomingStudent?.id === "string"
              ? incomingStudent.id.trim()
              : "";

          const studentName =
            typeof incomingStudent?.name === "string"
              ? incomingStudent.name.trim()
              : "";

          if (!googleStudentId || !studentName) {
            continue;
          }

          const incomingEmail = normalizeEmail(
            incomingStudent.email
          );

          const existingStudent =
            await tx.student.findUnique({
              where: {
                userId_googleStudentId: {
                  userId: user.id,
                  googleStudentId,
                },
              },
              select: {
                id: true,
                email: true,
              },
            });

          const student = existingStudent
            ? await tx.student.update({
                where: {
                  id: existingStudent.id,
                },
                data: {
                  name: studentName,
                  email:
                    incomingEmail ??
                    existingStudent.email ??
                    null,
                  active: true,
                },
              })
            : await tx.student.create({
                data: {
                  userId: user.id,
                  googleStudentId,
                  name: studentName,
                  email: incomingEmail,
                  active: true,
                },
              });

          importedStudentIds.push(student.id);

          await tx.classroomStudent.upsert({
            where: {
              classroomId_studentId: {
                classroomId: classroom.id,
                studentId: student.id,
              },
            },
            update: {
              status: "ACTIVE",
            },
            create: {
              classroomId: classroom.id,
              studentId: student.id,
              status: "ACTIVE",
            },
          });
        }

        if (importedStudentIds.length > 0) {
          await tx.classroomStudent.updateMany({
            where: {
              classroomId: classroom.id,
              studentId: {
                notIn: importedStudentIds,
              },
            },
            data: {
              status: "INACTIVE",
            },
          });
        } else {
          await tx.classroomStudent.updateMany({
            where: {
              classroomId: classroom.id,
            },
            data: {
              status: "INACTIVE",
            },
          });
        }

        return tx.classroom.findUnique({
          where: {
            id: classroom.id,
          },
          include: {
            enrollments: {
              where: {
                status: "ACTIVE",
              },
              include: {
                student: true,
              },
            },
          },
        });
      }
    );

    if (!result) {
      return Response.json(
        { error: "Classroom could not be saved" },
        { status: 500 }
      );
    }

    const students = result.enrollments
      .map((enrollment) => ({
        id: enrollment.student.googleStudentId,
        name: enrollment.student.name,
        email: enrollment.student.email ?? undefined,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const studentsWithEmails = students.filter(
      (student) => Boolean(student.email)
    ).length;

    return Response.json({
      classroom: {
        id: result.googleCourseId,
        name: result.name,
        section: result.section ?? undefined,
        room: result.room ?? undefined,
      },
      students,
      importedStudentCount: students.length,
      studentsWithEmails,
      studentsWithoutEmails:
        students.length - studentsWithEmails,
    });
  } catch (error) {
    console.error("[ClassroomImportPOST] Error:", error);

    return Response.json(
      { error: "Failed to import classroom" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const classroom = await prisma.classroom.findFirst({
      where: {
        userId: user.id,
        active: true,
      },
      orderBy: {
        lastSyncedAt: "desc",
      },
    });

    if (!classroom) {
      return Response.json({ success: true });
    }

    await prisma.$transaction([
      prisma.classroomStudent.updateMany({
        where: {
          classroomId: classroom.id,
        },
        data: {
          status: "INACTIVE",
        },
      }),
      prisma.classroom.update({
        where: {
          id: classroom.id,
        },
        data: {
          active: false,
        },
      }),
    ]);

    return Response.json({ success: true });
  } catch (error) {
    console.error("[ClassroomImportDELETE] Error:", error);

    return Response.json(
      { error: "Failed to clear saved classroom" },
      { status: 500 }
    );
  }
}