import { NextRequest, NextResponse } from "next/server";
import {
  AuthorizationError,
  requireAuthenticatedUser,
  requireSubscription,
  requireTeacher,
} from "@/lib/auth/authorization";

const SPEAKER_SERVICE_URL = process.env.SPEAKER_SERVICE_URL;
const MAX_AUDIO_UPLOAD_BYTES = 25 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 30_000;
const ALLOWED_AUDIO_MIME_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
]);

type AccessPolicy = "public" | "protected";

type RoutePolicy = {
  route: string;
  methods: Set<string>;
  access: AccessPolicy;
};

const ROUTE_POLICIES: RoutePolicy[] = [
  {
    route: "/health",
    methods: new Set(["GET"]),
    access: "public",
  },
  {
    route: "/enroll",
    methods: new Set(["POST"]),
    access: "protected",
  },
  {
    route: "/identify",
    methods: new Set(["POST"]),
    access: "protected",
  },
  {
    route: "/profiles",
    methods: new Set(["GET"]),
    access: "protected",
  },
];

function getTimeoutMs(): number {
  const raw = process.env.SPEAKER_PROXY_TIMEOUT_MS;
  const parsed = Number(raw);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.min(120_000, Math.max(1_000, parsed));
}

function normalizeProxyPath(rawPath: string): string | null {
  const path = rawPath.replace(/^\/api\/speaker/, "").trim();

  if (!path || path === "/") {
    return null;
  }

  if (
    path.includes("..") ||
    path.includes("\\") ||
    path.includes("://") ||
    path.startsWith("//") ||
    path.includes("?") ||
    path.includes("#") ||
    /[\u0000-\u001f]/.test(path)
  ) {
    return null;
  }

  const normalized = path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path;

  return normalized;
}

function resolveRoutePolicy(proxyPath: string): RoutePolicy | null {
  const normalized = proxyPath.endsWith("/") ? proxyPath.slice(0, -1) : proxyPath;
  return ROUTE_POLICIES.find((policy) => policy.route === normalized) ?? null;
}

function buildTargetUrl(proxyPath: string, search: string): URL {
  if (!SPEAKER_SERVICE_URL) {
    throw new Error("speaker-service-unconfigured");
  }

  const baseUrl = new URL(SPEAKER_SERVICE_URL);
  const basePath = baseUrl.pathname.endsWith("/")
    ? baseUrl.pathname.slice(0, -1)
    : baseUrl.pathname;

  baseUrl.pathname = `${basePath}${proxyPath}`;
  baseUrl.search = search;

  return baseUrl;
}

function createAllowHeader(methods: Set<string>): string {
  return Array.from(methods).join(", ");
}

function pickForwardHeaders(req: NextRequest): Headers {
  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  const accept = req.headers.get("accept");

  if (contentType) {
    headers.set("content-type", contentType);
  }

  if (accept) {
    headers.set("accept", accept);
  } else {
    headers.set("accept", "application/json");
  }

  headers.set("user-agent", "oral-iq-ai-speaker-proxy/1.0");

  return headers;
}

function sanitizeResponseHeaders(input: Headers): Headers {
  const headers = new Headers(input);
  headers.delete("connection");
  headers.delete("keep-alive");
  headers.delete("proxy-authenticate");
  headers.delete("proxy-authorization");
  headers.delete("te");
  headers.delete("trailer");
  headers.delete("transfer-encoding");
  headers.delete("upgrade");
  return headers;
}

function normalizeMimeType(value: string): string {
  return value.toLowerCase().split(";")[0]?.trim() ?? "";
}

function isMultipartContentType(contentType: string | null): boolean {
  return Boolean(contentType?.toLowerCase().includes("multipart/form-data"));
}

function jsonError(status: number, error: string, extraHeaders?: HeadersInit) {
  return NextResponse.json(
    { error },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(extraHeaders ?? {}),
      },
    }
  );
}

async function validateProtectedUpload(req: NextRequest, proxyPath: string): Promise<NextResponse | null> {
  const requiresAudioValidation = proxyPath === "/enroll" || proxyPath === "/identify";

  if (!requiresAudioValidation) {
    return null;
  }

  const contentType = req.headers.get("content-type");

  if (!isMultipartContentType(contentType)) {
    return jsonError(415, "Unsupported media type. Use multipart/form-data for audio upload.");
  }

  const contentLengthHeader = req.headers.get("content-length");
  const contentLength = Number(contentLengthHeader);

  if (Number.isFinite(contentLength) && contentLength > MAX_AUDIO_UPLOAD_BYTES) {
    return jsonError(413, "Audio upload is too large. Maximum supported size is 25 MB.");
  }

  try {
    const formData = await req.clone().formData();
    const audioField = formData.get("audio");

    if (!(audioField instanceof File)) {
      return jsonError(400, "Missing audio file in multipart payload.");
    }

    if (audioField.size <= 0) {
      return jsonError(400, "Audio file is empty.");
    }

    if (audioField.size > MAX_AUDIO_UPLOAD_BYTES) {
      return jsonError(413, "Audio upload is too large. Maximum supported size is 25 MB.");
    }

    const normalizedAudioType = normalizeMimeType(audioField.type);

    if (!ALLOWED_AUDIO_MIME_TYPES.has(normalizedAudioType)) {
      return jsonError(415, "Unsupported audio format for speaker processing.");
    }
  } catch {
    return jsonError(400, "Malformed multipart request.");
  }

  return null;
}

async function handleProxy(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  const proxyPath = normalizeProxyPath(req.nextUrl.pathname);

  if (!proxyPath) {
    return jsonError(400, "Invalid speaker route path.");
  }

  const policy = resolveRoutePolicy(proxyPath);

  if (!policy) {
    return jsonError(404, "Speaker route not found.");
  }

  if (!policy.methods.has(req.method)) {
    return jsonError(405, "Method not allowed.", {
      Allow: createAllowHeader(policy.methods),
    });
  }

  let userIdForLogs = "anonymous";

  if (policy.access === "protected") {
    try {
      const auth = await requireAuthenticatedUser();
      requireTeacher(auth);
      const billing = await requireSubscription(auth, 402);
      userIdForLogs = billing.user.id;
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return jsonError(error.status, error.message);
      }

      return jsonError(500, "Authorization failed.");
    }

    const uploadValidationError = await validateProtectedUpload(req, proxyPath);

    if (uploadValidationError) {
      return uploadValidationError;
    }
  }

  let targetUrl: URL;

  try {
    targetUrl = buildTargetUrl(proxyPath, req.nextUrl.search);
  } catch {
    return jsonError(500, "Speaker service is not configured.");
  }

  let requestBody: ArrayBuffer | undefined;

  if (req.method !== "GET" && req.method !== "HEAD") {
    requestBody = await req.arrayBuffer();

    if (requestBody.byteLength <= 0) {
      return jsonError(400, "Request body is required.");
    }

    if (requestBody.byteLength > MAX_AUDIO_UPLOAD_BYTES) {
      return jsonError(413, "Request body is too large.");
    }
  }

  const controller = new AbortController();
  const timeoutMs = getTimeoutMs();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const upstreamResponse = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: pickForwardHeaders(req),
      body: requestBody,
      signal: controller.signal,
      redirect: "manual",
    });

    const response = new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: sanitizeResponseHeaders(upstreamResponse.headers),
    });

    console.info("[SpeakerProxy] request-complete", {
      route: proxyPath,
      method: req.method,
      status: upstreamResponse.status,
      durationMs: Date.now() - startTime,
      userId: userIdForLogs,
    });

    return response;
  } catch (error) {
    const aborted = controller.signal.aborted;

    console.error("[SpeakerProxy] request-failed", {
      route: proxyPath,
      method: req.method,
      durationMs: Date.now() - startTime,
      userId: userIdForLogs,
      category: aborted ? "timeout" : "downstream-unavailable",
    });

    if (aborted) {
      return jsonError(504, "Speaker service timed out.");
    }

    return jsonError(502, "Speaker service is unavailable.");
  } finally {
    clearTimeout(timeoutId);
  }
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleProxy(req);
}

export async function POST(req: NextRequest) {
  return handleProxy(req);
}

export async function PUT(req: NextRequest) {
  return handleProxy(req);
}

export async function PATCH(req: NextRequest) {
  return handleProxy(req);
}

export async function DELETE(req: NextRequest) {
  return handleProxy(req);
}

export async function HEAD(req: NextRequest) {
  return handleProxy(req);
}

export async function OPTIONS(req: NextRequest) {
  return handleProxy(req);
}
