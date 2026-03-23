import { NextRequest, NextResponse } from "next/server";
import { getDraft, updateDraftStatus } from "@/lib/db";
import { publishToThreads } from "@/lib/publish/threads";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft = getDraft(id);
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  if (draft.status === "published") return NextResponse.json({ error: "Already published" }, { status: 400 });

  updateDraftStatus(id, "publishing");

  try {
    if (draft.platform === "threads") {
      const result = await publishToThreads(draft.content);
      updateDraftStatus(id, "published", {
        published_id: result.postId,
        published_at: new Date().toISOString(),
      });
      return NextResponse.json({ status: "published", postId: result.postId });
    }

    return NextResponse.json({ error: `Publishing to ${draft.platform} not yet supported` }, { status: 400 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    updateDraftStatus(id, "failed", { error: errorMsg });
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
