"use client";

import { useEffect, useState } from "react";
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

  const filtered = filterType === "ALL" ? media : media.filter((m) => m.media_type === filterType);

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "engagement": return engagementRate(b) - engagementRate(a);
      case "reach": return (b.reach ?? 0) - (a.reach ?? 0);
      case "save_rate": return saveRate(b) - saveRate(a);
      case "latest":
      default: return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {sorted.length} post{sorted.length !== 1 ? "s" : ""}
      </p>

      <div className="flex gap-2">
        <Select value={filterType} onValueChange={(v) => v && setFilterType(v as MediaTypeFilter)}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="IMAGE">Image</SelectItem>
            <SelectItem value="VIDEO">Video</SelectItem>
            <SelectItem value="REEL">Reel</SelectItem>
            <SelectItem value="CAROUSEL_ALBUM">Carousel</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => v && setSortBy(v as SortKey)}>
          <SelectTrigger className="w-[150px] h-8 text-xs">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="engagement">Engagement</SelectItem>
            <SelectItem value="reach">Reach</SelectItem>
            <SelectItem value="save_rate">Save Rate</SelectItem>
            <SelectItem value="latest">Latest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {sorted.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">No posts found. Sync from the dashboard first.</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Reach</TableHead>
                <TableHead className="text-right">Eng%</TableHead>
                <TableHead className="text-right">Saves</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((post) => (
                <TableRow
                  key={post.id}
                  className="cursor-pointer"
                  onClick={() => window.location.href = `/posts/${post.id}`}
                >
                  <TableCell className="text-sm">{formatDate(post.timestamp)}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{post.media_type}</Badge></TableCell>
                  <TableCell className="text-right text-sm">{formatNumber(post.reach ?? 0)}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{formatPercent(engagementRate(post))}</TableCell>
                  <TableCell className="text-right text-sm">{formatNumber(post.saved ?? 0)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">&rarr;</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
