import {
  AuthorizationError,
  requireTeacherSubscription,
} from "@/lib/auth/authorization";
import {
  getGoogleAccessTokenForUser,
  GoogleReconnectRequiredError,
} from "@/lib/auth/google-tokens";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const fileId = url.searchParams.get("fileId");

  try {
    const auth = await requireTeacherSubscription(402);
    const token = await getGoogleAccessTokenForUser(auth.user.id);

    if (fileId) {
      // Try exporting Google Docs as plain text
      const exportRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=text/plain`,
        {
          headers: { Authorization: `Bearer ${token.accessToken}` },
        }
      );

      if (exportRes.ok) {
        const content = await exportRes.text();
        return new Response(JSON.stringify({ content }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Fallback: download file media (for plain text or other types)
      const mediaRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
        {
          headers: { Authorization: `Bearer ${token.accessToken}` },
        }
      );

      if (mediaRes.ok) {
        const content = await mediaRes.text();
        return new Response(JSON.stringify({ content }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const errText = await exportRes.text();
      return new Response(JSON.stringify({ error: "Could not fetch file", details: errText }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // List files that look like rubrics (name contains 'rubric')
    const q = encodeURIComponent("name contains 'rubric' or name contains 'Rubric'");
    const listRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=50&fields=files(id,name,mimeType,owners)&spaces=drive`,
      {
        headers: { Authorization: `Bearer ${token.accessToken}` },
      }
    );

    if (!listRes.ok) {
      const body = await listRes.text();
      return new Response(JSON.stringify({ error: 'Drive list failed', details: body }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const data = await listRes.json();

    return new Response(JSON.stringify({ files: data.files || [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: e.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (e instanceof GoogleReconnectRequiredError) {
      return new Response(
        JSON.stringify({ error: "Google authorization expired. Please sign out and sign in again." }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.error("Rubric route error", { category: "rubric-fetch-failure" });
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
