import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { requireSubscriptionAccess } from "@/lib/subscription-access";

type ClassroomProfile = {
  id?: string;
  name?: {
    givenName?: string;
    familyName?: string;
    fullName?: string;
  };
  emailAddress?: string;
  photoUrl?: string;
};

type ClassroomStudent = {
  courseId?: string;
  userId?: string;
  profile?: ClassroomProfile;
};

type GoogleClassroomResponse = {
  students?: ClassroomStudent[];
  nextPageToken?: string;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

function jsonResponse(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    const accessToken = (
      session as typeof session & {
        accessToken?: string;
      }
    )?.accessToken;

    if (!accessToken) {
      return jsonResponse(
        {
          error:
            "Not signed in with Google. Please sign out and sign in again.",
        },
        401
      );
    }

    const access = await requireSubscriptionAccess();

    if (!access?.canAccess) {
      return jsonResponse(
        { error: "Subscription required" },
        402
      );
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId")?.trim();

    if (!courseId) {
      return jsonResponse(
        {
          error: "Missing courseId.",
        },
        400
      );
    }

    const allStudents: ClassroomStudent[] = [];
    let nextPageToken: string | undefined;

    do {
      const googleUrl = new URL(
        `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(
          courseId
        )}/students`
      );

      googleUrl.searchParams.set("pageSize", "100");

      if (nextPageToken) {
        googleUrl.searchParams.set(
          "pageToken",
          nextPageToken
        );
      }

      const response = await fetch(googleUrl.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const data =
        (await response.json()) as GoogleClassroomResponse;

      if (!response.ok) {
        console.error(
          "[Classroom Students] Google API error:",
          data
        );

        return jsonResponse(
          {
            error:
              data.error?.message ||
              "Google Classroom could not load the students.",
            googleStatus: data.error?.status,
          },
          response.status
        );
      }

      if (Array.isArray(data.students)) {
        allStudents.push(...data.students);
      }

      nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    console.log(
      "========================================"
    );
    console.log("RAW GOOGLE CLASSROOM STUDENTS");
    console.log(JSON.stringify(allStudents, null, 2));
    console.log(
      "========================================"
    );

    const students = allStudents
      .map((student) => {
        const id =
          student.userId?.trim() ||
          student.profile?.id?.trim();

        if (!id) {
          return null;
        }

        const firstName =
          student.profile?.name?.givenName?.trim() ||
          "";

        const lastName =
          student.profile?.name?.familyName?.trim() ||
          "";

        const fullName =
          student.profile?.name?.fullName?.trim() ||
          "";

        const email =
          student.profile?.emailAddress
            ?.trim()
            .toLowerCase() || undefined;

        const name =
          fullName ||
          [firstName, lastName]
            .filter(Boolean)
            .join(" ") ||
          email ||
          "Unknown Student";

        return {
          id,
          name,
          email,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          photoUrl:
            student.profile?.photoUrl?.trim() ||
            undefined,
        };
      })
      .filter(
        (
          student
        ): student is {
          id: string;
          name: string;
          email: string | undefined;
          firstName: string | undefined;
          lastName: string | undefined;
          photoUrl: string | undefined;
        } => student !== null
      );

    const studentsWithEmails = students.filter(
      (student) => Boolean(student.email)
    ).length;

    console.log("[Classroom Students] Import summary:", {
      courseId,
      totalStudents: students.length,
      studentsWithEmails,
      studentsWithoutEmails:
        students.length - studentsWithEmails,
    });

    return jsonResponse({
      students,
      totalStudents: students.length,
      studentsWithEmails,
      studentsWithoutEmails:
        students.length - studentsWithEmails,
    });
  } catch (error) {
    console.error(
      "[Classroom Students] Unexpected error:",
      error
    );

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load Google Classroom students.",
      },
      500
    );
  }
}