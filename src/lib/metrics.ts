export interface MediaWithInsight {
  id: string;
  media_type: string;
  caption: string | null;
  permalink: string | null;
  media_url: string | null;
  timestamp: string;
  like_count: number;
  comments_count: number;
  reach?: number;
  views?: number;
  saved?: number;
  shares?: number;
  total_interactions?: number;
  insight_likes?: number;
  insight_comments?: number;
  plays?: number;
}

export function engagementRate(m: MediaWithInsight): number {
  const interactions =
    (m.insight_likes ?? m.like_count) +
    (m.insight_comments ?? m.comments_count) +
    (m.shares ?? 0) +
    (m.saved ?? 0);
  const reach = m.reach ?? 0;
  if (reach === 0) return 0;
  return (interactions / reach) * 100;
}

export function saveRate(m: MediaWithInsight): number {
  const reach = m.reach ?? 0;
  if (reach === 0) return 0;
  return ((m.saved ?? 0) / reach) * 100;
}

export function shareRate(m: MediaWithInsight): number {
  const reach = m.reach ?? 0;
  if (reach === 0) return 0;
  return ((m.shares ?? 0) / reach) * 100;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export function formatPercent(n: number): string {
  return n.toFixed(1) + "%";
}

export function formatDate(ts: string): string {
  const d = new Date(ts);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export interface DashboardKPIs {
  totalReach: number;
  avgEngagementRate: number;
  avgSaveRate: number;
  postCount: number;
}

export function computeKPIs(media: MediaWithInsight[]): DashboardKPIs {
  if (media.length === 0) {
    return { totalReach: 0, avgEngagementRate: 0, avgSaveRate: 0, postCount: 0 };
  }

  const totalReach = media.reduce((sum, m) => sum + (m.reach ?? 0), 0);
  const engagementRates = media.map(engagementRate);
  const saveRates = media.map(saveRate);

  return {
    totalReach,
    avgEngagementRate:
      engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length,
    avgSaveRate: saveRates.reduce((a, b) => a + b, 0) / saveRates.length,
    postCount: media.length,
  };
}
