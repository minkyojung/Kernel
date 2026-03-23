import { NextResponse } from "next/server";
import { getDueScheduledDrafts, updateDraftStatus } from "@/lib/db";
import { publishToThreads } from "@/lib/publish/threads";

export async function POST() {
  const dueDrafts = getDueScheduledDrafts();

  if (dueDrafts.length === 0) {
    return NextResponse.json({ message: "No drafts due", processed: 0 });
  }

  const results: { id: string; status: string; error?: string }[] = [];

  for (const draft of dueDrafts) {
    updateDraftStatus(draft.id, "publishing");
    try {
      if (draft.platform === "threads") {
        const result = await publishToThreads(draft.content);
        updateDraftStatus(draft.id, "published", {
          published_id: result.postId,
          published_at: new Date().toISOString(),
        });
        results.push({ id: draft.id, status: "published" });
      } else {
        updateDraftStatus(draft.id, "failed", { error: `${draft.platform} not supported yet` });
        results.push({ id: draft.id, status: "failed", error: `${draft.platform} not supported` });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      updateDraftStatus(draft.id, "failed", { error: errorMsg });
      results.push({ id: draft.id, status: "failed", error: errorMsg });
    }
  }

  return NextResponse.json({ message: `Processed ${results.length} drafts`, results });
}
