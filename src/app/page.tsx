"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type MediaWithInsight,
  computeKPIs,
  engagementRate,
  saveRate,
  formatNumber,
  formatPercent,
  formatDate,
} from "@/lib/metrics";

type Period = "7" | "30" | "90";

function filterByPeriod(media: MediaWithInsight[], days: Period): MediaWithInsight[] {
  const cutoff = Date.now() - Number(days) * 24 * 60 * 60 * 1000;
  return media.filter((m) => new Date(m.timestamp).getTime() > cutoff);
}

export default function DashboardPage() {
  const [allMedia, setAllMedia] = useState<MediaWithInsight[]>([]);
  const [period, setPeriod] = useState<Period>("30");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState<"strategy" | "performance" | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchData = () => {
    fetch("/api/insights")
      .then((res) => res.json())
      .then((data) => setAllMedia(data.data || []))
      .catch(() => setAllMedia([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/insights", { method: "POST" });
      const data = await res.json();
      setAllMedia(data.data || []);
    } catch {
      // handled
    } finally {
      setSyncing(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setAnalysis(data.error);
        setAnalysisType(null);
      } else {
        setAnalysis(data.analysis);
        setAnalysisType(data.type);
      }
    } catch {
      setAnalysis("Failed to generate analysis. Please try again.");
      setAnalysisType(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const media = filterByPeriod(allMedia, period);
  const kpis = computeKPIs(media);
  const topPosts = [...media]
    .sort((a, b) => engagementRate(b) - engagementRate(a))
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Content performance overview
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing} variant="outline">
          {syncing ? "Syncing..." : "Sync Now"}
        </Button>
      </div>

      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
        <TabsList>
          <TabsTrigger value="7">7 days</TabsTrigger>
          <TabsTrigger value="30">30 days</TabsTrigger>
          <TabsTrigger value="90">90 days</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Reach
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatNumber(kpis.totalReach)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Engagement Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatPercent(kpis.avgEngagementRate)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Save Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatPercent(kpis.avgSaveRate)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kpis.postCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Analysis */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">
              {analysisType === "strategy"
                ? "AI Content Strategy"
                : analysisType === "performance"
                  ? "AI Performance Analysis"
                  : "AI Insights"}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {allMedia.length === 0
                ? "Get personalized content strategy based on your profile"
                : "Get AI-powered analysis of your content performance"}
            </p>
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={analyzing}
            variant="outline"
            size="sm"
          >
            {analyzing ? "Analyzing..." : "Analyze"}
          </Button>
        </CardHeader>
        {analysis && (
          <CardContent>
            <div className="max-h-[500px] overflow-y-auto rounded-md bg-muted/30 p-4">
              <div className="whitespace-pre-wrap text-sm leading-relaxed [&>*]:mb-0">
                {analysis.split("\n").map((line, i) => {
                  if (line.startsWith("## ")) {
                    return (
                      <h3 key={i} className="mt-4 mb-2 text-base font-semibold first:mt-0">
                        {line.replace("## ", "")}
                      </h3>
                    );
                  }
                  if (line.startsWith("### ")) {
                    return (
                      <h4 key={i} className="mt-3 mb-1 text-sm font-semibold">
                        {line.replace("### ", "")}
                      </h4>
                    );
                  }
                  if (line.startsWith("- ")) {
                    return (
                      <p key={i} className="ml-4 my-0.5 text-muted-foreground">
                        {line}
                      </p>
                    );
                  }
                  if (line.trim() === "") {
                    return <div key={i} className="h-2" />;
                  }
                  return (
                    <p key={i} className="my-0.5 text-muted-foreground">
                      {line}
                    </p>
                  );
                })}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Top Posts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Performing Posts</CardTitle>
        </CardHeader>
        <CardContent>
          {topPosts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No data yet.{" "}
              <a href="/connect" className="underline">
                Connect Instagram
              </a>{" "}
              and sync to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Reach</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Likes</TableHead>
                  <TableHead className="text-right">Saved</TableHead>
                  <TableHead className="text-right">Eng. Rate</TableHead>
                  <TableHead className="text-right">Save Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPosts.map((post) => (
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
