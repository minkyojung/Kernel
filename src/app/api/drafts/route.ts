import { NextRequest, NextResponse } from "next/server";
import { getAllDrafts, createDraft } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    const drafts = getAllDrafts();
    return NextResponse.json({ drafts });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const draft = createDraft({
      id: randomUUID(),
      source_type: body.source_type || "manual",
      platform: body.platform || "threads",
      format: body.format || "thread",
      title: body.title || "",
      content: body.content,
      scheduled_at: body.scheduled_at,
    });
    return NextResponse.json({ draft });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
