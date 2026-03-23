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
  formatNumber,
  formatPercent,
  formatDate,
} from "@/lib/metrics";
import { TrendingUp, TrendingDown, Minus, RefreshCw, Sparkles, CheckCircle2, Circle, Loader2, Zap, ArrowRight } from "lucide-react";

type Period = "7" | "30" | "90";

function filterByPeriod(media: MediaWithInsight[], days: Period): MediaWithInsight[] {
  const cutoff = Date.now() - Number(days) * 24 * 60 * 60 * 1000;
  return media.filter((m) => new Date(m.timestamp).getTime() > cutoff);
}

function TrendIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp className="w-3 h-3 text-emerald-500" />;
  if (value < 0) return <TrendingDown className="w-3 h-3 text-red-400" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}

export default function DashboardPage() {
  const [allMedia, setAllMedia] = useState<MediaWithInsight[]>([]);
  const [period, setPeriod] = useState<Period>("30");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [hasConnections, setHasConnections] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [draftCount, setDraftCount] = useState(0);
  const [monitoring, setMonitoring] = useState(false);
  const [monitorResult, setMonitorResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/insights").then(r => r.json()).then(d => setAllMedia(d.data || [])).catch(() => {}).finally(() => setLoading(false));
    fetch("/api/profile").then(r => r.json()).then(d => { if (d.profile?.category) setHasProfile(true); }).catch(() => {});
    fetch("/api/auth/status").then(r => r.json()).then(d => {
      const conns = d.connections || [];
      setHasConnections(conns.some((c: { connected: boolean }) => c.connected));
    }).catch(() => {});
    fetch("/api/drafts").then(r => r.json()).then(d => {
      const drafts = d.drafts || [];
      setPendingCount(drafts.filter((x: { status: string }) => x.status === "pending_review").length);
      setDraftCount(drafts.filter((x: { status: string }) => x.status === "draft" || x.status === "scheduled").length);
    }).catch(() => {});
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/insights", { method: "POST" });
      const data = await res.json();
      setAllMedia(data.data || []);
    } catch {} finally { setSyncing(false); }
  };

  const handleMonitor = async () => {
    setMonitoring(true);
    setMonitorResult(null);
    try {
      const res = await fetch("/api/cron/monitor", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setMonitorResult(data.error);
      } else {
        const parts: string[] = [];
        if (data.newsCollected > 0) parts.push(`${data.newsCollected} news`);
        if (data.githubCollected > 0) parts.push(`${data.githubCollected} repos`);
        if (data.draftsGenerated > 0) parts.push(`${data.draftsGenerated} drafts generated`);
        setMonitorResult(parts.length > 0 ? parts.join(", ") : "No new sources found");
        // Refresh pending count
        const dRes = await fetch("/api/drafts");
        const dData = await dRes.json();
        const drafts = dData.drafts || [];
        setPendingCount(drafts.filter((x: { status: string }) => x.status === "pending_review").length);
        setDraftCount(drafts.filter((x: { status: string }) => x.status === "draft" || x.status === "scheduled").length);
      }
    } catch {
      setMonitorResult("Monitor failed");
    } finally { setMonitoring(false); }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze", { method: "POST" });
      const data = await res.json();
      setAnalysis(data.analysis || data.error || "No analysis available.");
    } catch {
      setAnalysis("Failed to generate analysis.");
    } finally { setAnalyzing(false); }
  };

  const media = filterByPeriod(allMedia, period);
  const kpis = computeKPIs(media);
  const topPosts = [...media].sort((a, b) => engagementRate(b) - engagementRate(a)).slice(0, 5);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;
  }

  // Empty state: no posts
  if (allMedia.length === 0) {
    const steps = [
      { label: "Connect Instagram", done: hasConnections, href: "/connect" },
      { label: "Set up profile", done: hasProfile, href: "/settings" },
      { label: "Run Monitor to find content ideas", done: false },
      { label: "Review & publish your first post", done: false },
    ];

    return (
      <div className="flex flex-col items-center justify-center py-16 max-w-md mx-auto text-center">
        <Sparkles className="w-10 h-10 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Welcome to Kernel</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Set up your profile and post your first content to unlock AI-powered analytics.
        </p>
        <div className="flex gap-3 mb-8">
          {!hasProfile && <a href="/settings"><Button size="sm">Set up Profile</Button></a>}
          {!hasConnections && <a href="/connect"><Button size="sm" variant="outline">Connect Account</Button></a>}
          {hasProfile && hasConnections && (
            <Button size="sm" onClick={handleMonitor} disabled={monitoring}>
              {monitoring ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Scanning...</> : <><Zap className="w-3.5 h-3.5 mr-1.5" />Run Monitor</>}
            </Button>
          )}
        </div>
        <Card className="w-full text-left">
          <CardHeader><CardTitle className="text-sm">Getting Started</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {steps.map((s) => (
              <div key={s.label} className="flex items-center gap-3 text-sm">
                {s.done ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                {s.href && !s.done ? <a href={s.href} className="hover:underline">{s.label}</a> : <span className={s.done ? "text-muted-foreground line-through" : ""}>{s.label}</span>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Data state
  const kpiCards = [
    { label: "Reach", value: formatNumber(kpis.totalReach), change: 0 },
    { label: "Eng. Rate", value: formatPercent(kpis.avgEngagementRate), change: 0 },
    { label: "Save Rate", value: formatPercent(kpis.avgSaveRate), change: 0 },
    { label: "Posts", value: String(kpis.postCount), change: 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Action Required */}
      {(pendingCount > 0 || draftCount > 0) && (
        <a href="/compose" className="block">
          <Card className="border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition-colors dark:border-amber-900 dark:bg-amber-950/20 dark:hover:bg-amber-950/30">
            <CardContent className="flex items-center justify-between py-3 px-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span className="text-sm">
                  {pendingCount > 0
                    ? <><strong>{pendingCount} draft{pendingCount > 1 ? "s" : ""}</strong> waiting for your review</>
                    : <><strong>{draftCount}</strong> draft{draftCount > 1 ? "s" : ""} ready in queue</>
                  }
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </a>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Content performance overview</p>
        <div className="flex items-center gap-2">
          <Button onClick={handleMonitor} disabled={monitoring} variant="outline" size="sm">
            {monitoring
              ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Scanning...</>
              : <><Zap className="w-3.5 h-3.5 mr-1.5" />Run Monitor</>
            }
          </Button>
          <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing" : "Sync"}
          </Button>
        </div>
      </div>

      {monitorResult && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">{monitorResult}</p>
      )}

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-semibold tracking-tight">{k.value}</span>
                <TrendIcon value={k.change} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Period tabs */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
        <TabsList>
          <TabsTrigger value="7">7d</TabsTrigger>
          <TabsTrigger value="30">30d</TabsTrigger>
          <TabsTrigger value="90">90d</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* AI Insights */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">AI Insights</CardTitle>
          </div>
          <Button onClick={handleAnalyze} disabled={analyzing} variant="ghost" size="sm">
            {analyzing ? "Analyzing..." : "Analyze"}
          </Button>
        </CardHeader>
        {analysis ? (
          <CardContent className="pt-0">
            <div className="rounded-lg bg-muted/30 p-4 max-h-[400px] overflow-y-auto">
              <div className="text-sm leading-relaxed space-y-1">
                {analysis.split("\n").map((line, i) => {
                  if (line.startsWith("## ")) return <h3 key={i} className="mt-3 mb-1 font-semibold first:mt-0">{line.replace("## ", "")}</h3>;
                  if (line.startsWith("### ")) return <h4 key={i} className="mt-2 mb-1 text-sm font-medium">{line.replace("### ", "")}</h4>;
                  if (line.startsWith("- ")) return <p key={i} className="ml-3 text-muted-foreground">{line}</p>;
                  if (!line.trim()) return <div key={i} className="h-1.5" />;
                  return <p key={i} className="text-muted-foreground">{line}</p>;
                })}
              </div>
            </div>
          </CardContent>
        ) : (
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              {hasProfile
                ? "Click Analyze to get AI-powered insights about your content."
                : "Set up your profile first to get personalized insights."}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Recent Posts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-medium">Recent Posts</CardTitle>
          <a href="/posts" className="text-xs text-muted-foreground hover:text-foreground">View all &rarr;</a>
        </CardHeader>
        <CardContent className="pt-0">
          {topPosts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No posts in this period. Try expanding the date range.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Reach</TableHead>
                  <TableHead className="text-right">Eng%</TableHead>
                  <TableHead className="text-right">Saves</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPosts.map((post) => (
                  <TableRow key={post.id} className="cursor-pointer" onClick={() => window.location.href = `/posts/${post.id}`}>
                    <TableCell className="text-sm">{formatDate(post.timestamp)}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{post.media_type}</Badge></TableCell>
                    <TableCell className="text-right text-sm">{formatNumber(post.reach ?? 0)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatPercent(engagementRate(post))}</TableCell>
                    <TableCell className="text-right text-sm">{formatNumber(post.saved ?? 0)}</TableCell>
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
