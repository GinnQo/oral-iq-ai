import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { requireSubscriptionAccess } from "@/lib/subscription-access";

export async function GET() {
  const session: any = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const access = await requireSubscriptionAccess();

  if (!access?.canAccess) {
    return Response.json({ error: "Subscription required" }, { status: 402 });
  }

  const response = await fetch(
    "https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE",
    {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    }
  );

  const data = await response.json();

  return Response.json(data);
}