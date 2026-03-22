"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  type MediaWithInsight,
  engagementRate,
  saveRate,
  shareRate,
  formatNumber,
  formatPercent,
} from "@/lib/metrics";
import { ExternalLink } from "lucide-react";

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<MediaWithInsight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/insights")
      .then((res) => res.json())
      .then((data) => {
        const found = (data.data || []).find((m: MediaWithInsight) => m.id === id);
        setPost(found || null);
      })
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Post not found.</p>
        <a href="/posts"><Button variant="outline" size="sm">Back to posts</Button></a>
      </div>
    );
  }

  const dateStr = new Date(post.timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const metrics = [
    { label: "Reach", value: formatNumber(post.reach ?? 0) },
    { label: "Likes", value: formatNumber(post.insight_likes ?? post.like_count) },
    { label: "Saves", value: formatNumber(post.saved ?? 0) },
    { label: "Views", value: formatNumber(post.views ?? 0) },
    { label: "Comments", value: formatNumber(post.insight_comments ?? post.comments_count) },
    { label: "Shares", value: formatNumber(post.shares ?? 0) },
  ];

  const rates = [
    { label: "Eng. Rate", value: formatPercent(engagementRate(post)) },
    { label: "Save Rate", value: formatPercent(saveRate(post)) },
    { label: "Share Rate", value: formatPercent(shareRate(post)) },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="secondary">{post.media_type}</Badge>
        <span>{dateStr}</span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Preview */}
        <Card>
          <CardContent className="pt-5">
            {post.media_url && (
              <div className="mb-4 overflow-hidden rounded-lg">
                {post.media_type === "VIDEO" || post.media_type === "REEL" ? (
                  <video src={post.media_url} controls className="w-full" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.media_url} alt="Post" className="w-full" />
                )}
              </div>
            )}
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {post.caption || "No caption"}
            </p>
            {post.permalink && (
              <>
                <Separator className="my-4" />
                <a href={post.permalink} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" />
                    View on Instagram
                  </Button>
                </a>
              </>
            )}
          </CardContent>
        </Card>

        {/* Right: Metrics */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground mb-4 font-medium uppercase tracking-wider">Metrics</p>
              <div className="grid grid-cols-3 gap-y-5">
                {metrics.map((m) => (
                  <div key={m.label}>
                    <p className="text-xl font-semibold tracking-tight">{m.value}</p>
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </div>

              <Separator className="my-5" />

              <p className="text-xs text-muted-foreground mb-4 font-medium uppercase tracking-wider">Rates</p>
              <div className="grid grid-cols-3 gap-y-5">
                {rates.map((r) => (
                  <div key={r.label}>
                    <p className="text-xl font-semibold tracking-tight">{r.value}</p>
                    <p className="text-xs text-muted-foreground">{r.label}</p>
                  </div>
                ))}
              </div>

              {(post.media_type === "REEL" || post.media_type === "VIDEO") && post.plays != null && (
                <>
                  <Separator className="my-5" />
                  <p className="text-xs text-muted-foreground mb-4 font-medium uppercase tracking-wider">Video</p>
                  <div>
                    <p className="text-xl font-semibold tracking-tight">{formatNumber(post.plays)}</p>
                    <p className="text-xs text-muted-foreground">Plays</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
