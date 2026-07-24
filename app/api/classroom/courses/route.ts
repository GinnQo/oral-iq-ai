import {
  AuthorizationError,
  requireTeacherSubscription,
} from "@/lib/auth/authorization";
import {
  getGoogleAccessTokenForUser,
  GoogleReconnectRequiredError,
} from "@/lib/auth/google-tokens";

export async function GET() {
  try {
    const auth = await requireTeacherSubscription(402);
    const token = await getGoogleAccessTokenForUser(auth.user.id);

    const response = await fetch(
      "https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE",
      {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    return Response.json(data, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof GoogleReconnectRequiredError) {
      return Response.json(
        { error: "Google authorization expired. Please sign out and sign in again." },
        { status: 401 }
      );
    }

    console.error("[ClassroomCoursesGET] Error", {
      category: "google-classroom-courses-failure",
    });

    return Response.json({ error: "Unable to load Google Classroom courses" }, { status: 500 });
  }
}