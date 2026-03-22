import { getToken, upsertMedia, upsertMediaInsight } from "./db";

function getAccessToken(): string {
  const token = getToken("instagram");
  if (!token) {
    throw new Error("Instagram not connected");
  }
  return token.access_token;
}

interface IGMedia {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  permalink?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

interface IGInsightValue {
  value: number;
}

interface IGInsightMetric {
  name: string;
  values: IGInsightValue[];
}

const MEDIA_FIELDS = [
  "id",
  "caption",
  "media_type",
  "media_url",
  "permalink",
  "timestamp",
  "like_count",
  "comments_count",
].join(",");

export async function fetchAndStoreMedia(): Promise<number> {
  const accessToken = getAccessToken();

  const url = new URL("https://graph.instagram.com/me/media");
  url.searchParams.set("fields", MEDIA_FIELDS);
  url.searchParams.set("limit", "50");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to fetch media: ${JSON.stringify(err)}`);
  }

  const data = (await res.json()) as { data: IGMedia[] };
  let count = 0;

  for (const item of data.data) {
    upsertMedia({
      id: item.id,
      platform: "instagram",
      media_type: item.media_type,
      caption: item.caption || null,
      permalink: item.permalink || null,
      media_url: item.media_url || null,
      timestamp: item.timestamp,
      like_count: item.like_count || 0,
      comments_count: item.comments_count || 0,
    });
    count++;
  }

  return count;
}

export async function fetchAndStoreInsights(mediaId: string, mediaType: string): Promise<void> {
  const accessToken = getAccessToken();

  // Determine which metrics to request based on media type
  const metrics: string[] = ["reach", "saved", "shares", "total_interactions", "likes", "comments"];

  if (mediaType === "REEL" || mediaType === "VIDEO") {
    metrics.push("plays");
  }

  // Use 'views' for all types (replaces deprecated 'impressions')
  metrics.push("views");

  const url = new URL(`https://graph.instagram.com/${mediaId}/insights`);
  url.searchParams.set("metric", metrics.join(","));
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString());
  if (!res.ok) {
    // Some metrics might not be available for all media types, skip silently
    console.warn(`Failed to fetch insights for ${mediaId}: ${res.status}`);
    return;
  }

  const data = (await res.json()) as { data: IGInsightMetric[] };

  const insightMap: Record<string, number> = {};
  for (const metric of data.data) {
    insightMap[metric.name] = metric.values?.[0]?.value ?? 0;
  }

  upsertMediaInsight({
    media_id: mediaId,
    reach: insightMap.reach ?? 0,
    views: insightMap.views ?? 0,
    saved: insightMap.saved ?? 0,
    shares: insightMap.shares ?? 0,
    total_interactions: insightMap.total_interactions ?? 0,
    likes: insightMap.likes ?? 0,
    comments: insightMap.comments ?? 0,
    plays: insightMap.plays ?? 0,
    fetched_at: new Date().toISOString(),
  });
}

export async function syncAllInsights(): Promise<number> {
  const accessToken = getAccessToken();

  // First fetch media
  const mediaCount = await fetchAndStoreMedia();

  // Then fetch insights for each media
  const url = new URL("https://graph.instagram.com/me/media");
  url.searchParams.set("fields", "id,media_type");
  url.searchParams.set("limit", "50");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error("Failed to fetch media list for insights");
  }

  const data = (await res.json()) as { data: { id: string; media_type: string }[] };

  let insightCount = 0;
  for (const item of data.data) {
    try {
      await fetchAndStoreInsights(item.id, item.media_type);
      insightCount++;
    } catch (e) {
      console.warn(`Skipped insights for ${item.id}:`, e);
    }
  }

  return insightCount;
}
