import { NextRequest, NextResponse } from "next/server";
import { getDraft, updateDraftContent, getProfile, getAllPatterns, getAllMediaWithInsights } from "@/lib/db";
import { generateThreadsPost } from "@/lib/openai";
import { rankByER, type MediaWithInsight } from "@/lib/metrics";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft = getDraft(id);
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

  const profile = getProfile();
  if (!profile) return NextResponse.json({ error: "Profile not set up" }, { status: 400 });

  const body = await req.json().catch(() => ({})) as { instruction?: string };

  const patterns = getAllPatterns();
  const allMedia = getAllMediaWithInsights() as unknown as MediaWithInsight[];
  const topPosts = rankByER(allMedia, 3);

  // Use draft title as source context + optional instruction
  const sourceData: Record<string, string> = { original_content: draft.content };
  if (body.instruction) {
    sourceData.user_instruction = body.instruction;
  }

  const generated = await generateThreadsPost(
    profile,
    {
      source_type: draft.source_type || "manual",
      title: draft.title,
      raw_data: JSON.stringify(sourceData),
    },
    { patterns, topPosts },
  );

  updateDraftContent(id, generated.content, generated.title);

  const updated = getDraft(id);
  return NextResponse.json({ draft: updated });
}
