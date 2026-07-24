import {
  AuthorizationError,
  requireTeacherSubscription,
} from "@/lib/auth/authorization";
import fs from "fs/promises";
import path from "path";

const FOLDER = path.join(process.cwd(), "data");
const FILE = path.join(FOLDER, "saved_rubrics.json");

async function readStore() {
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    return JSON.parse(raw || "{}");
  } catch (e) {
    return {};
  }
}

async function writeStore(obj: any) {
  await fs.mkdir(FOLDER, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(obj, null, 2), "utf-8");
}

export async function GET(req: Request) {
  try {
    const auth = await requireTeacherSubscription(402);

    const store = await readStore();
    const entry = store[auth.user.email] || null;

    return new Response(JSON.stringify({ entry }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireTeacherSubscription(402);

    const body = await req.json();
    const { name, content } = body;

    if (!name || !content) {
      return new Response(JSON.stringify({ error: "Missing name or content" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const store = await readStore();
    store[auth.user.email] = {
      name,
      content,
      updatedAt: new Date().toISOString(),
    };

    await writeStore(store);

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: e.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.error("Save rubric error", e);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
