import { NextResponse } from "next/server";
import {
  getProfile,
  getAllMediaWithInsights,
  replaceAllPatterns,
  getAllPatterns,
} from "@/lib/db";
import { extractContentPatterns } from "@/lib/gemini";
import type { MediaWithInsight } from "@/lib/metrics";

// GET: return stored patterns
export async function GET() {
  try {
    const patterns = getAllPatterns();
    return NextResponse.json({ patterns });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// POST: re-analyze published posts and refresh patterns
export async function POST() {
  try {
    const profile = getProfile();
    if (!profile) {
      return NextResponse.json(
        { error: "Profile not set up" },
        { status: 400 },
      );
    }

    const rawMedia = getAllMediaWithInsights();
    if (rawMedia.length === 0) {
      return NextResponse.json(
        { error: "No published posts to analyze" },
        { status: 400 },
      );
    }

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
      insight_comments: (m as unknown as Record<string, unknown>)
        .insight_comments as number | undefined,
      plays: m.plays,
    }));

    const patterns = await extractContentPatterns(profile, media);

    if (patterns.length === 0) {
      return NextResponse.json(
        { error: "Could not extract patterns from current data" },
        { status: 400 },
      );
    }

    replaceAllPatterns(patterns);

    const stored = getAllPatterns();
    return NextResponse.json({
      patterns: stored,
      analyzed_posts: media.length,
    });
  } catch (error) {
    console.error("Pattern extraction error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
