"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type MediaWithInsight,
  engagementRate,
  saveRate,
  formatNumber,
  formatPercent,
  formatDate,
} from "@/lib/metrics";

type SortKey = "engagement" | "reach" | "save_rate" | "latest";
type MediaTypeFilter = "ALL" | "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "REEL";

export default function PostsPage() {
  const [media, setMedia] = useState<MediaWithInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>("engagement");
  const [filterType, setFilterType] = useState<MediaTypeFilter>("ALL");

  useEffect(() => {
    fetch("/api/insights")
      .then((res) => res.json())
      .then((data) => setMedia(data.data || []))
      .catch(() => setMedia([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filterType === "ALL"
      ? media
      : media.filter((m) => m.media_type === filterType);

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "engagement":
        return engagementRate(b) - engagementRate(a);
      case "reach":
        return (b.reach ?? 0) - (a.reach ?? 0);
      case "save_rate":
        return saveRate(b) - saveRate(a);
      case "latest":
      default:
        return (
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Posts</h1>
        <p className="text-muted-foreground">
          All your Instagram posts with performance metrics.
        </p>
      </div>

      <div className="flex gap-3">
        <Select
          value={filterType}
          onValueChange={(v) => setFilterType(v as MediaTypeFilter)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="IMAGE">Image</SelectItem>
            <SelectItem value="VIDEO">Video</SelectItem>
            <SelectItem value="REEL">Reel</SelectItem>
            <SelectItem value="CAROUSEL_ALBUM">Carousel</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sortBy}
          onValueChange={(v) => setSortBy(v as SortKey)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="engagement">Engagement Rate</SelectItem>
            <SelectItem value="reach">Reach</SelectItem>
            <SelectItem value="save_rate">Save Rate</SelectItem>
            <SelectItem value="latest">Latest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {sorted.length} posts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No posts found. Sync from the dashboard first.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="max-w-[200px]">Caption</TableHead>
                  <TableHead className="text-right">Reach</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Likes</TableHead>
                  <TableHead className="text-right">Saved</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right">Eng. Rate</TableHead>
                  <TableHead className="text-right">Save Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell>
                      <a
                        href={`/posts/${post.id}`}
                        className="hover:underline"
                      >
                        {formatDate(post.timestamp)}
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{post.media_type}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {post.caption?.slice(0, 50) || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(post.reach ?? 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(post.views ?? 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(post.insight_likes ?? post.like_count)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(post.saved ?? 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(post.shares ?? 0)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPercent(engagementRate(post))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPercent(saveRate(post))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
