interface HNStory {
  id: number;
  title: string;
  url?: string;
  score: number;
  by: string;
  time: number;
  descendants?: number;
}

export async function fetchTopTechNews(limit: number = 15): Promise<{
  stories: { title: string; url: string; score: number; comments: number; hnUrl: string }[];
}> {
  const topRes = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
  if (!topRes.ok) throw new Error("Failed to fetch HN top stories");

  const ids = (await topRes.json()) as number[];
  const topIds = ids.slice(0, limit);

  const stories = await Promise.all(
    topIds.map(async (id) => {
      const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
      return (await res.json()) as HNStory;
    }),
  );

  return {
    stories: stories
      .filter((s) => s.url)
      .map((s) => ({
        title: s.title,
        url: s.url!,
        score: s.score,
        comments: s.descendants ?? 0,
        hnUrl: `https://news.ycombinator.com/item?id=${s.id}`,
      })),
  };
}
