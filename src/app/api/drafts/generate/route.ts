import { NextRequest, NextResponse } from "next/server";
import { getProfile, getAllPatterns, getAllMediaWithInsights } from "@/lib/db";
import { generateDrafts } from "@/lib/gemini";
import { type MediaWithInsight, engagementRate } from "@/lib/metrics";
import { fetchTodayActivity } from "@/lib/sources/github";
import { fetchTopTechNews } from "@/lib/sources/news";

function getTopPosts(limit: number): MediaWithInsight[] {
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
    insight_comments: (m as unknown as Record<string, unknown>)
      .insight_comments as number | undefined,
    plays: m.plays,
  }));

  return media
    .filter((m) => (m.reach ?? 0) > 0)
    .sort((a, b) => engagementRate(b) - engagementRate(a))
    .slice(0, limit);
}

export async function POST(req: NextRequest) {
  try {
    const { source, selectedStories } = (await req.json()) as {
      source: "news" | "github";
      selectedStories?: number[];
    };

    const profile = getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Profile not set up" }, { status: 400 });
    }

    let sourceContent: string;

    if (source === "github") {
      const activity = await fetchTodayActivity();
      if (activity.repos.length === 0) {
        return NextResponse.json({ error: "No GitHub activity today" }, { status: 400 });
      }
      sourceContent = activity.repos
        .map((r) => `### ${r.repo}\n${r.commits.map((c) => `- ${c.message}`).join("\n")}`)
        .join("\n\n");
    } else {
      const news = await fetchTopTechNews(15);
      const stories = selectedStories
        ? news.stories.filter((_, i) => selectedStories.includes(i))
        : news.stories.slice(0, 5);

      if (stories.length === 0) {
        return NextResponse.json({ error: "No stories selected" }, { status: 400 });
      }
      sourceContent = stories
        .map((s, i) => `${i + 1}. ${s.title} (${s.score} points, ${s.comments} comments)\n   ${s.url}`)
        .join("\n");
    }

    // Fetch performance context for smarter generation
    const patterns = getAllPatterns();
    const topPosts = getTopPosts(3);

    const drafts = await generateDrafts(profile, source, sourceContent, {
      patterns: patterns.length > 0 ? patterns : undefined,
      topPosts: topPosts.length > 0 ? topPosts : undefined,
    });

    return NextResponse.json({
      drafts,
      source,
      sourceContent,
      patternsUsed: patterns.length,
      topPostsUsed: topPosts.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
