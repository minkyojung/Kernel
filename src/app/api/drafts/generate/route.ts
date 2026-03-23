import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/db";
import { generateDrafts } from "@/lib/gemini";
import { fetchTodayActivity } from "@/lib/sources/github";
import { fetchTopTechNews } from "@/lib/sources/news";

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

    const drafts = await generateDrafts(profile, source, sourceContent);

    return NextResponse.json({ drafts, source, sourceContent });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
