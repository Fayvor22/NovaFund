import { NextResponse } from "next/server";
import fundingStore from "@/lib/funding-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const update = fundingStore.add(body);

    if (!update) {
      return NextResponse.json(
        {
          error:
            "Invalid funding update. Provide projectId plus at least one of raised, amount, or backers.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(update);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
