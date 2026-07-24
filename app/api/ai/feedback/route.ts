import {
  AuthorizationError,
  requireTeacherSubscription,
} from "@/lib/auth/authorization";

export async function GET() {
  try {
    await requireTeacherSubscription(402);

    return new Response(JSON.stringify({ error: "Not implemented" }), {
      status: 501,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
