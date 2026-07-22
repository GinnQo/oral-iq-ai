import { NextRequest, NextResponse } from "next/server";

const SPEAKER_SERVICE_URL = process.env.SPEAKER_SERVICE_URL;

function getTargetUrl(req: NextRequest): string {
  if (!SPEAKER_SERVICE_URL) {
    throw new Error("SPEAKER_SERVICE_URL is not configured");
  }

  const path = req.nextUrl.pathname.replace(/^\/api\/speaker/, "");
  const url = new URL(path, SPEAKER_SERVICE_URL);
  url.search = req.nextUrl.search;
  return url.toString();
}

async function proxy(req: NextRequest) {
  const targetUrl = getTargetUrl(req);
  const requestInit: RequestInit = {
    method: req.method,
    headers: req.headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
  };

  const response = await fetch(targetUrl, requestInit);
  const headers = new Headers(response.headers);
  headers.delete("transfer-encoding");

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return proxy(req);
}

export async function POST(req: NextRequest) {
  return proxy(req);
}
