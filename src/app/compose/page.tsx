"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Newspaper, Github, Loader2, Check, ChevronDown, ChevronUp,
  Send, Clock, Copy, Trash2,
} from "lucide-react";

interface NewsStory {
  title: string;
  url: string;
  score: number;
  comments: number;
  hnUrl: string;
}

interface GitHubRepo {
  repo: string;
  commits: { message: string; sha: string; date: string }[];
}

interface SavedDraft {
  id: string;
  platform: string;
  format: string;
  title: string;
  content: string;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
}

type SourceType = "news" | "github" | null;
type Step = "select" | "preview" | "drafts";

export default function ComposePage() {
  const [step, setStep] = useState<Step>("select");
  const [sourceType, setSourceType] = useState<SourceType>(null);
  const [loading, setLoading] = useState(false);

  const [stories, setStories] = useState<NewsStory[]>([]);
  const [selectedStories, setSelectedStories] = useState<number[]>([]);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [githubSummary, setGithubSummary] = useState("");
  const [drafts, setDrafts] = useState("");
  const [expandedDraft, setExpandedDraft] = useState<number | null>(0);

  // Saved drafts from DB
  const [savedDrafts, setSavedDrafts] = useState<SavedDraft[]>([]);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState<string | null>(null);
  const [scheduleTime, setScheduleTime] = useState("");

  useEffect(() => {
    loadSavedDrafts();
  }, []);

  const loadSavedDrafts = async () => {
    try {
      const res = await fetch("/api/drafts");
      const data = await res.json();
      setSavedDrafts(data.drafts || []);
    } catch { /* ignore */ }
  };

  const fetchSource = async (type: "news" | "github") => {
    setSourceType(type);
    setLoading(true);
    try {
      const res = await fetch(`/api/sources/${type}`);
      const data = await res.json();
      if (type === "news") {
        setStories(data.stories || []);
        setSelectedStories([0, 1, 2]);
      } else {
        setRepos(data.repos || []);
        setGithubSummary(data.summary || "");
      }
      setStep("preview");
    } catch { /* error */ }
    finally { setLoading(false); }
  };

  const generateDrafts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: sourceType,
          selectedStories: sourceType === "news" ? selectedStories : undefined,
        }),
      });
      const data = await res.json();
      setDrafts(data.error ? `Error: ${data.error}` : data.drafts);
      setStep("drafts");
    } catch {
      setDrafts("Failed to generate drafts");
      setStep("drafts");
    } finally { setLoading(false); }
  };

  const toggleStory = (idx: number) => {
    setSelectedStories((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
    );
  };

  const reset = () => {
    setStep("select");
    setSourceType(null);
    setStories([]);
    setSelectedStories([]);
    setRepos([]);
    setDrafts("");
    setExpandedDraft(0);
  };

  // Save a draft section to DB
  const saveDraft = async (title: string, body: string, platform: string, format: string) => {
    try {
      await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_type: sourceType || "manual",
          platform,
          format,
          title,
          content: body,
        }),
      });
      toast.success("Draft saved");
      loadSavedDrafts();
    } catch {
      toast.error("Failed to save draft");
    }
  };

  // Publish a saved draft
  const publishDraft = async (id: string) => {
    setPublishing(id);
    try {
      const res = await fetch(`/api/drafts/${id}/publish`, { method: "POST" });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success("Published to Threads!");
      }
      loadSavedDrafts();
    } catch {
      toast.error("Publish failed");
    } finally { setPublishing(null); }
  };

  // Schedule a saved draft
  const scheduleDraft = async (id: string) => {
    if (!scheduleTime) { toast.error("Pick a date/time"); return; }
    try {
      await fetch(`/api/drafts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_at: new Date(scheduleTime).toISOString() }),
      });
      toast.success("Scheduled!");
      setScheduling(null);
      setScheduleTime("");
      loadSavedDrafts();
    } catch {
      toast.error("Failed to schedule");
    }
  };

  const removeDraft = async (id: string) => {
    await fetch(`/api/drafts/${id}`, { method: "DELETE" });
    loadSavedDrafts();
  };

  // Detect platform/format from section title
  const detectPlatform = (title: string): { platform: string; format: string } => {
    const t = title.toLowerCase();
    if (t.includes("threads")) return { platform: "threads", format: "thread" };
    if (t.includes("carousel")) return { platform: "instagram", format: "carousel" };
    if (t.includes("reel")) return { platform: "instagram", format: "reel" };
    return { platform: "threads", format: "thread" };
  };

  const draftSections = drafts
    .split(/^## /m)
    .filter(Boolean)
    .map((s) => {
      const [title, ...body] = s.split("\n");
      return { title: title.trim(), body: body.join("\n").trim() };
    });

  const statusBadge = (status: string) => {
    const variants: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
      draft: "secondary", scheduled: "outline", publishing: "default",
      published: "default", failed: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  return (
    <div className="max-w-2xl">
      {/* Step 1: Select Source */}
      {step === "select" && (
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pick a source to generate post drafts from.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => fetchSource("news")}
                disabled={loading}
                className="flex items-start gap-3 rounded-lg border border-border p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <Newspaper className="w-5 h-5 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">Tech News</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Top HN stories → carousel or thread posts
                  </p>
                </div>
              </button>
              <button
                onClick={() => fetchSource("github")}
                disabled={loading}
                className="flex items-start gap-3 rounded-lg border border-border p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <Github className="w-5 h-5 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">GitHub Activity</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Today&apos;s commits → &quot;what I built&quot; posts
                  </p>
                </div>
              </button>
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Fetching...
              </div>
            )}
          </div>

          {/* Saved Drafts */}
          {savedDrafts.length > 0 && (
            <div className="space-y-3">
              <Separator />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Saved Drafts
              </p>
              {savedDrafts.map((d) => (
                <Card key={d.id}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium truncate">{d.title || "Untitled"}</span>
                          {statusBadge(d.status)}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{d.content.slice(0, 100)}...</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground capitalize">{d.platform} · {d.format}</span>
                          {d.scheduled_at && (
                            <span className="text-[10px] text-muted-foreground">
                              Scheduled: {new Date(d.scheduled_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {d.status === "draft" && d.platform === "threads" && (
                          <>
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => setScheduling(scheduling === d.id ? null : d.id)}
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => publishDraft(d.id)}
                              disabled={publishing === d.id}
                            >
                              {publishing === d.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Send className="w-3.5 h-3.5" />
                              }
                            </Button>
                          </>
                        )}
                        {d.status === "scheduled" && (
                          <Button variant="ghost" size="sm" onClick={() => removeDraft(d.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {(d.status === "draft" || d.status === "failed") && (
                          <Button variant="ghost" size="sm" onClick={() => removeDraft(d.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {/* Schedule picker */}
                    {scheduling === d.id && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                        <input
                          type="datetime-local"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                        />
                        <Button size="sm" onClick={() => scheduleDraft(d.id)}>Schedule</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Preview & Select */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {sourceType === "news" ? "Select stories to turn into posts" : "Today's GitHub activity"}
            </p>
            <Button variant="ghost" size="sm" onClick={reset}>Back</Button>
          </div>

          {sourceType === "news" && (
            <div className="space-y-1">
              {stories.map((s, i) => (
                <button
                  key={i}
                  onClick={() => toggleStory(i)}
                  className={`w-full flex items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${
                    selectedStories.includes(i) ? "bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    selectedStories.includes(i) ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  }`}>
                    {selectedStories.includes(i) && <Check className="w-3 h-3" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.score} pts · {s.comments} comments</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {sourceType === "github" && (
            <div className="space-y-3">
              {repos.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No GitHub activity today yet. Push some commits first!
                  </CardContent>
                </Card>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">{githubSummary}</p>
                  {repos.map((r) => (
                    <Card key={r.repo}>
                      <CardContent className="pt-4 pb-3">
                        <p className="text-sm font-medium mb-2">{r.repo}</p>
                        <div className="space-y-1">
                          {r.commits.map((c) => (
                            <p key={c.sha} className="text-xs text-muted-foreground">
                              <span className="font-mono text-[10px]">{c.sha}</span> {c.message}
                            </p>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={generateDrafts}
              disabled={loading || (sourceType === "news" && selectedStories.length === 0) || (sourceType === "github" && repos.length === 0)}
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generating...</> : "Generate Drafts"}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Generated Drafts */}
      {step === "drafts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{sourceType === "news" ? "Tech News" : "GitHub"}</Badge>
              <span className="text-xs text-muted-foreground">{draftSections.length} drafts</span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep("preview")}>Back</Button>
              <Button variant="outline" size="sm" onClick={reset}>New</Button>
            </div>
          </div>

          <div className="space-y-2">
            {draftSections.map((section, i) => {
              const { platform, format } = detectPlatform(section.title);
              return (
                <Card key={i}>
                  <button
                    onClick={() => setExpandedDraft(expandedDraft === i ? null : i)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="text-sm font-medium">{section.title}</span>
                    {expandedDraft === i
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    }
                  </button>
                  {expandedDraft === i && (
                    <>
                      <Separator />
                      <CardContent className="pt-4">
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          {section.body.split("\n").map((line, j) => {
                            if (line.startsWith("- **")) return <p key={j} className="my-1">{line}</p>;
                            if (!line.trim()) return <div key={j} className="h-2" />;
                            return <p key={j} className="text-muted-foreground">{line}</p>;
                          })}
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                          <Button
                            variant="outline" size="sm"
                            onClick={() => { navigator.clipboard.writeText(section.body); toast.success("Copied"); }}
                          >
                            <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                          </Button>
                          <Button
                            variant="outline" size="sm"
                            onClick={() => saveDraft(section.title, section.body, platform, format)}
                          >
                            Save Draft
                          </Button>
                        </div>
                      </CardContent>
                    </>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
