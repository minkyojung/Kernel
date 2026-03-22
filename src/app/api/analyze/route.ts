import { NextResponse } from "next/server";
import { getProfile, getAllMediaWithInsights } from "@/lib/db";
import { analyzeStrategy, analyzePerformance } from "@/lib/gemini";
import type { MediaWithInsight } from "@/lib/metrics";

export async function POST() {
  try {
    const profile = getProfile();
    if (!profile) {
      return NextResponse.json(
        { error: "Profile not set. Please configure your profile first." },
        { status: 400 },
      );
    }

    const rawMedia = getAllMediaWithInsights();
    const media: MediaWithInsight[] = rawMedia.map((m) => ({
      id: m.id,
      media_type: m.media_type,
      caption: m.caption,
      permalink: m.permalink,
      media_url: m.media_url,
      timestamp: m.timestamp,
      like_count: m.like_count,
      comments_count: m.comments_count,
      reach: m.reach,
      views: m.views,
      saved: m.saved,
      shares: m.shares,
      total_interactions: m.total_interactions,
      insight_likes: (m as unknown as Record<string, unknown>).insight_likes as
        | number
        | undefined,
      insight_comments: (m as unknown as Record<string, unknown>).insight_comments as
        | number
        | undefined,
      plays: m.plays,
    }));

    let analysis: string;
    let type: "strategy" | "performance";

    if (media.length === 0) {
      type = "strategy";
      analysis = await analyzeStrategy(profile);
    } else {
      type = "performance";
      analysis = await analyzePerformance(profile, media);
    }

    return NextResponse.json({ type, analysis, postCount: media.length });
  } catch (err) {
    console.error("Analyze error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 },
    );
  }
}
