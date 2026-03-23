import { NextResponse } from "next/server";
import {
  getProfile,
  getAllPatterns,
  upsertSourceItem,
  getNewSources,
  getRelevantSources,
  updateSourceRelevance,
  markSourceUsed,
  createDraft,
  cleanOldSources,
} from "@/lib/db";
import { scoreRelevance } from "@/lib/gemini";
import { generateThreadsPost } from "@/lib/openai";
import { rankByER, type MediaWithInsight } from "@/lib/metrics";
import { getAllMediaWithInsights } from "@/lib/db";
import { fetchTopTechNews } from "@/lib/sources/news";
import { fetchTodayActivity } from "@/lib/sources/github";
import { createHash, randomUUID } from "crypto";

function hashId(source: string, key: string): string {
  return createHash("sha256").update(`${source}:${key}`).digest("hex").slice(0, 16);
}

export async function POST() {
  const profile = getProfile();
  if (!profile) {
    return NextResponse.json({ error: "Profile not set up" }, { status: 400 });
  }

  const results = {
    newsCollected: 0,
    githubCollected: 0,
    scored: 0,
    relevant: 0,
    draftsGenerated: 0,
    cleaned: 0,
  };

  // --- Step 1: Collect sources ---

  // News
  try {
    const news = await fetchTopTechNews(15);
    for (const story of news.stories) {
      const id = hashId("news", story.hnUrl);
      const inserted = upsertSourceItem({
        id,
        source_type: "news",
        title: story.title,
        url: story.url,
        raw_data: JSON.stringify(story),
      });
      if (inserted) results.newsCollected++;
    }
  } catch (err) {
    console.error("Monitor: news fetch failed", err);
  }

  // GitHub
  try {
    const activity = await fetchTodayActivity();
    for (const repo of activity.repos) {
      const commitSummary = repo.commits.map((c) => c.message).join("; ");
      const id = hashId("github", `${repo.repo}:${activity.date}`);
      const inserted = upsertSourceItem({
        id,
        source_type: "github",
        title: `${repo.repo}: ${repo.commits.length} commits`,
        url: `https://github.com/${repo.repo}`,
        raw_data: JSON.stringify({ repo: repo.repo, commits: repo.commits, summary: commitSummary }),
      });
      if (inserted) results.githubCollected++;
    }
  } catch (err) {
    console.error("Monitor: github fetch failed", err);
  }

  // --- Step 2: Score new items for relevance ---
  const newItems = getNewSources();
  if (newItems.length > 0) {
    try {
      const scores = await scoreRelevance(
        profile,
        newItems.map((item) => ({
          id: item.id,
          source_type: item.source_type,
          title: item.title,
          raw_data: item.raw_data,
        })),
      );

      for (const s of scores) {
        const status = s.score >= 0.6 ? "relevant" : "dismissed";
        updateSourceRelevance(s.id, s.score, s.reason, status);
        if (status === "relevant") results.relevant++;
      }
      results.scored = scores.length;
    } catch (err) {
      console.error("Monitor: relevance scoring failed", err);
    }
  }

  // --- Step 3: Auto-generate drafts from top relevant sources ---
  const relevantSources = getRelevantSources(3); // Top 3 by score
  if (relevantSources.length > 0) {
    const patterns = getAllPatterns();
    const allMedia = getAllMediaWithInsights() as unknown as MediaWithInsight[];
    const topPosts = rankByER(allMedia, 3);

    for (const source of relevantSources) {
      try {
        const generated = await generateThreadsPost(
          profile,
          { source_type: source.source_type, title: source.title, raw_data: source.raw_data },
          { patterns, topPosts },
        );

        createDraft({
          id: randomUUID(),
          source_type: source.source_type,
          platform: "threads",
          format: "post",
          title: generated.title,
          content: generated.content,
          status: "pending_review",
        });

        markSourceUsed(source.id);
        results.draftsGenerated++;
      } catch (err) {
        console.error(`Monitor: draft generation failed for ${source.id}`, err);
      }
    }
  }

  // --- Step 4: Clean old items ---
  results.cleaned = cleanOldSources(7);

  return NextResponse.json({
    message: "Monitor complete",
    ...results,
  });
}
