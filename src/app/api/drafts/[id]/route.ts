import { NextRequest, NextResponse } from "next/server";
import { getDraft, updateDraftContent, updateDraftSchedule, updateDraftStatus, deleteDraft } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft = getDraft(id);
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ draft });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  if (body.content !== undefined) {
    updateDraftContent(id, body.content, body.title);
  }
  if (body.scheduled_at !== undefined) {
    updateDraftSchedule(id, body.scheduled_at);
  }
  if (body.status !== undefined && body.content === undefined && body.scheduled_at === undefined) {
    updateDraftStatus(id, body.status);
  }

  const draft = getDraft(id);
  return NextResponse.json({ draft });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteDraft(id);
  return NextResponse.json({ ok: true });
}
