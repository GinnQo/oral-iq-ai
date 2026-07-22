import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const fileId = url.searchParams.get("fileId");

  const session: any = await getServerSession(authOptions as any);
  const accessToken: string | undefined = session?.accessToken;

  if (!accessToken) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    if (fileId) {
      // Try exporting Google Docs as plain text
      const exportRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=text/plain`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
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
          headers: { Authorization: `Bearer ${accessToken}` },
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
        headers: { Authorization: `Bearer ${accessToken}` },
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
    console.error("Rubric route error", e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
