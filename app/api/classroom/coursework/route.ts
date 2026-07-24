import {
  AuthorizationError,
  requireTeacherSubscription,
} from "@/lib/auth/authorization";
import {
  getGoogleAccessTokenForUser,
  GoogleReconnectRequiredError,
} from "@/lib/auth/google-tokens";

type RawCourseWork = {
  id?: string;
  title?: string;
  description?: string;
  alternateLink?: string;
  maxPoints?: number;
  state?: string;
  creationTime?: string;
  updateTime?: string;
};

type CourseWorkResponse = {
  courseWork?: RawCourseWork[];
  nextPageToken?: string;
  error?: {
    code?: number;
    status?: string;
    message?: string;
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

function normalizeCourseWorkItem(item: RawCourseWork) {
  const id = typeof item.id === "string" ? item.id.trim() : "";
  const title = typeof item.title === "string" ? item.title.trim() : "";

  if (!id || !title) {
    return null;
  }

  return {
    id,
    title,
    description:
      typeof item.description === "string"
        ? item.description.trim() || null
        : null,
    alternateLink:
      typeof item.alternateLink === "string"
        ? item.alternateLink.trim() || null
        : null,
    maxPoints:
      typeof item.maxPoints === "number" && Number.isFinite(item.maxPoints)
        ? item.maxPoints
        : null,
    state:
      typeof item.state === "string" && item.state.trim()
        ? item.state.trim()
        : "UNKNOWN",
    creationTime:
      typeof item.creationTime === "string" && item.creationTime.trim()
        ? item.creationTime
        : null,
    updateTime:
      typeof item.updateTime === "string" && item.updateTime.trim()
        ? item.updateTime
        : null,
  };
}

export async function GET(request: Request) {
  try {
    const auth = await requireTeacherSubscription(402);
    const token = await getGoogleAccessTokenForUser(auth.user.id);

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId")?.trim();

    if (!courseId) {
      return jsonResponse({ error: "Missing courseId." }, 400);
    }

    const allItems: RawCourseWork[] = [];
    let nextPageToken: string | undefined;

    do {
      const googleUrl = new URL(
        `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(
          courseId
        )}/courseWork`
      );

      googleUrl.searchParams.set("pageSize", "100");
      googleUrl.searchParams.set("courseWorkStates", "PUBLISHED");

      if (nextPageToken) {
        googleUrl.searchParams.set("pageToken", nextPageToken);
      }

      const response = await fetch(googleUrl.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const data = (await response.json()) as CourseWorkResponse;

      if (!response.ok) {
        return jsonResponse(
          {
            error:
              data.error?.message ||
              "Google Classroom could not load assignments.",
            googleStatus: data.error?.status || null,
          },
          response.status
        );
      }

      if (Array.isArray(data.courseWork)) {
        allItems.push(...data.courseWork);
      }

      nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    const assignments = allItems
      .map(normalizeCourseWorkItem)
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter((item) => item.state !== "DELETED");

    return jsonResponse({
      courseId,
      assignments,
      totalAssignments: assignments.length,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonResponse({ error: error.message }, error.status);
    }

    if (error instanceof GoogleReconnectRequiredError) {
      return jsonResponse(
        {
          error:
            "Google authorization expired. Please sign out and sign in again.",
        },
        401
      );
    }

    console.error("[ClassroomCourseworkGET] Error", {
      category: "google-classroom-coursework-failure",
    });

    return jsonResponse(
      { error: "Unable to load Google Classroom assignments." },
      500
    );
  }
}
