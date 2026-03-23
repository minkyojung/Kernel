"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Newspaper, Github, Loader2, Check, ChevronDown, ChevronUp,
  Send, Clock, Copy, Trash2, Pencil, CalendarIcon, X,
} from "lucide-react";
import { format } from "date-fns";

// --- Types ---

interface NewsStory {
  title: string; url: string; score: number; comments: number; hnUrl: string;
}
interface GitHubRepo {
  repo: string; commits: { message: string; sha: string; date: string }[];
}
interface SavedDraft {
  id: string; platform: string; format: string; title: string;
  content: string; status: string; scheduled_at: string | null;
  published_at: string | null; created_at: string;
}

type SourceType = "news" | "github" | null;
type CreateStep = "select" | "preview" | "generated";

// --- Compose Page ---

export default function ComposePage() {
  const [savedDrafts, setSavedDrafts] = useState<SavedDraft[]>([]);
  const [activeTab, setActiveTab] = useState("queue");

  const loadDrafts = useCallback(async () => {
    try {
      const res = await fetch("/api/drafts");
      const data = await res.json();
      setSavedDrafts(data.drafts || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-3xl">
      <TabsList className="mb-4">
        <TabsTrigger value="create">Create</TabsTrigger>
        <TabsTrigger value="queue">
          Queue
          {savedDrafts.filter(d => d.status === "draft" || d.status === "scheduled").length > 0 && (
            <span className="ml-1.5 text-[10px] bg-primary/10 text-primary rounded-full px-1.5">
              {savedDrafts.filter(d => d.status === "draft" || d.status === "scheduled").length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="calendar">Calendar</TabsTrigger>
      </TabsList>

      <TabsContent value="create">
        <CreateTab onDraftSaved={() => { loadDrafts(); setActiveTab("queue"); }} />
      </TabsContent>

      <TabsContent value="queue">
        <QueueTab drafts={savedDrafts} onUpdate={loadDrafts} />
      </TabsContent>

      <TabsContent value="calendar">
        <CalendarTab drafts={savedDrafts} onUpdate={loadDrafts} />
      </TabsContent>
    </Tabs>
  );
}

// ============================================================
// CREATE TAB
// ============================================================

function CreateTab({ onDraftSaved }: { onDraftSaved: () => void }) {
  const [step, setStep] = useState<CreateStep>("select");
  const [sourceType, setSourceType] = useState<SourceType>(null);
  const [loading, setLoading] = useState(false);
  const [stories, setStories] = useState<NewsStory[]>([]);
  const [selectedStories, setSelectedStories] = useState<number[]>([]);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [githubSummary, setGithubSummary] = useState("");
  const [drafts, setDrafts] = useState("");
  const [expandedDraft, setExpandedDraft] = useState<number | null>(0);

  const fetchSource = async (type: "news" | "github") => {
    setSourceType(type);
    setLoading(true);
    try {
      const res = await fetch(`/api/sources/${type}`);
      const data = await res.json();
      if (type === "news") { setStories(data.stories || []); setSelectedStories([0, 1, 2]); }
      else { setRepos(data.repos || []); setGithubSummary(data.summary || ""); }
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
        body: JSON.stringify({ source: sourceType, selectedStories: sourceType === "news" ? selectedStories : undefined }),
      });
      const data = await res.json();
      setDrafts(data.error ? `Error: ${data.error}` : data.drafts);
      setStep("generated");
    } catch { setDrafts("Failed to generate drafts"); setStep("generated"); }
    finally { setLoading(false); }
  };

  const toggleStory = (idx: number) => {
    setSelectedStories(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };

  const reset = () => {
    setStep("select"); setSourceType(null); setStories([]); setSelectedStories([]);
    setRepos([]); setDrafts(""); setExpandedDraft(0);
  };

  const detectPlatform = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes("threads")) return { platform: "threads", format: "thread" };
    if (t.includes("carousel")) return { platform: "instagram", format: "carousel" };
    if (t.includes("reel")) return { platform: "instagram", format: "reel" };
    return { platform: "threads", format: "thread" };
  };

  const saveDraft = async (title: string, body: string, platform: string, fmt: string) => {
    try {
      await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_type: sourceType || "manual", platform, format: fmt, title, content: body }),
      });
      toast.success("Draft saved");
      onDraftSaved();
    } catch { toast.error("Failed to save"); }
  };

  const draftSections = drafts.split(/^## /m).filter(Boolean).map(s => {
    const [title, ...body] = s.split("\n");
    return { title: title.trim(), body: body.join("\n").trim() };
  });

  // Step: Select Source
  if (step === "select") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Pick a source to generate post drafts from.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={() => fetchSource("news")} disabled={loading}
            className="flex items-start gap-3 rounded-lg border border-border p-4 text-left hover:bg-muted/50 transition-colors">
            <Newspaper className="w-5 h-5 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">Tech News</p>
              <p className="text-xs text-muted-foreground mt-0.5">Top HN stories → carousel or thread posts</p>
            </div>
          </button>
          <button onClick={() => fetchSource("github")} disabled={loading}
            className="flex items-start gap-3 rounded-lg border border-border p-4 text-left hover:bg-muted/50 transition-colors">
            <Github className="w-5 h-5 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">GitHub Activity</p>
              <p className="text-xs text-muted-foreground mt-0.5">Today&apos;s commits → &quot;what I built&quot; posts</p>
            </div>
          </button>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Fetching...
          </div>
        )}
      </div>
    );
  }

  // Step: Preview Source
  if (step === "preview") {
    return (
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
              <button key={i} onClick={() => toggleStory(i)}
                className={`w-full flex items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${selectedStories.includes(i) ? "bg-primary/5" : "hover:bg-muted/50"}`}>
                <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedStories.includes(i) ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
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
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No GitHub activity today yet.</CardContent></Card>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">{githubSummary}</p>
                {repos.map(r => (
                  <Card key={r.repo}><CardContent className="pt-4 pb-3">
                    <p className="text-sm font-medium mb-2">{r.repo}</p>
                    {r.commits.map(c => (
                      <p key={c.sha} className="text-xs text-muted-foreground">
                        <span className="font-mono text-[10px]">{c.sha}</span> {c.message}
                      </p>
                    ))}
                  </CardContent></Card>
                ))}
              </>
            )}
          </div>
        )}
        <div className="flex justify-end">
          <Button onClick={generateDrafts}
            disabled={loading || (sourceType === "news" && selectedStories.length === 0) || (sourceType === "github" && repos.length === 0)}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generating...</> : "Generate Drafts"}
          </Button>
        </div>
      </div>
    );
  }

  // Step: Generated Drafts
  return (
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
          const { platform, format: fmt } = detectPlatform(section.title);
          return (
            <Card key={i}>
              <button onClick={() => setExpandedDraft(expandedDraft === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left">
                <span className="text-sm font-medium">{section.title}</span>
                {expandedDraft === i ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
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
                      <Button variant="outline" size="sm"
                        onClick={() => { navigator.clipboard.writeText(section.body); toast.success("Copied"); }}>
                        <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                      </Button>
                      <Button size="sm" onClick={() => saveDraft(section.title, section.body, platform, fmt)}>
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
  );
}

// ============================================================
// QUEUE TAB
// ============================================================

function QueueTab({ drafts, onUpdate }: { drafts: SavedDraft[]; onUpdate: () => void }) {
  const [publishing, setPublishing] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<SavedDraft | null>(null);
  const [editContent, setEditContent] = useState("");
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleHour, setScheduleHour] = useState("09");
  const [scheduleMin, setScheduleMin] = useState("00");

  const draftItems = drafts.filter(d => d.status === "draft");
  const scheduledItems = drafts.filter(d => d.status === "scheduled").sort((a, b) =>
    (a.scheduled_at || "").localeCompare(b.scheduled_at || ""));
  const publishedItems = drafts.filter(d => d.status === "published" || d.status === "failed")
    .sort((a, b) => (b.published_at || b.created_at).localeCompare(a.published_at || a.created_at));

  const publishDraft = async (id: string) => {
    setPublishing(id);
    try {
      const res = await fetch(`/api/drafts/${id}/publish`, { method: "POST" });
      const data = await res.json();
      if (data.error) toast.error(data.error);
      else toast.success("Published!");
      onUpdate();
    } catch { toast.error("Publish failed"); }
    finally { setPublishing(null); }
  };

  const scheduleDraft = async (id: string) => {
    if (!scheduleDate) { toast.error("Pick a date"); return; }
    const dt = new Date(scheduleDate);
    dt.setHours(parseInt(scheduleHour), parseInt(scheduleMin), 0, 0);
    try {
      await fetch(`/api/drafts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_at: dt.toISOString() }),
      });
      toast.success("Scheduled!");
      setSchedulingId(null);
      setScheduleDate(undefined);
      onUpdate();
    } catch { toast.error("Failed to schedule"); }
  };

  const cancelSchedule = async (id: string) => {
    await fetch(`/api/drafts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduled_at: null }),
    });
    toast.success("Moved back to drafts");
    onUpdate();
  };

  const removeDraft = async (id: string) => {
    await fetch(`/api/drafts/${id}`, { method: "DELETE" });
    onUpdate();
  };

  const saveEdit = async () => {
    if (!editingDraft) return;
    await fetch(`/api/drafts/${editingDraft.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });
    toast.success("Updated");
    setEditingDraft(null);
    onUpdate();
  };

  const openEdit = (draft: SavedDraft) => {
    setEditingDraft(draft);
    setEditContent(draft.content);
  };

  const DraftCard = ({ draft, actions }: { draft: SavedDraft; actions: React.ReactNode }) => (
    <div className="flex items-start gap-3 rounded-lg border border-border p-4">
      <div className="w-1 self-stretch rounded-full shrink-0" style={{
        backgroundColor: draft.platform === "threads" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
      }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium capitalize">{draft.platform}</span>
          <span className="text-xs text-muted-foreground">· {draft.format}</span>
        </div>
        <p className="text-sm leading-relaxed line-clamp-3">{draft.content.slice(0, 200)}</p>
        {draft.scheduled_at && (
          <p className="text-xs text-muted-foreground mt-2">
            <Clock className="w-3 h-3 inline mr-1" />
            {format(new Date(draft.scheduled_at), "MMM d, yyyy · h:mm a")}
          </p>
        )}
        {draft.published_at && (
          <p className="text-xs text-muted-foreground mt-2">
            Published {format(new Date(draft.published_at), "MMM d, yyyy · h:mm a")}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">{actions}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {draftItems.length === 0 && scheduledItems.length === 0 && publishedItems.length === 0 && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No drafts yet. Go to Create to generate some.
        </div>
      )}

      {/* Drafts */}
      {draftItems.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Drafts</p>
          {draftItems.map(d => (
            <div key={d.id}>
              <DraftCard draft={d} actions={
                <>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => setSchedulingId(schedulingId === d.id ? null : d.id)}>
                    <Clock className="w-3.5 h-3.5" />
                  </Button>
                  {d.platform === "threads" && (
                    <Button variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => publishDraft(d.id)} disabled={publishing === d.id}>
                      {publishing === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeDraft(d.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              } />
              {/* Schedule picker */}
              {schedulingId === d.id && (
                <Card className="mt-2 ml-4">
                  <CardContent className="pt-4 pb-3 space-y-3">
                    <Calendar mode="single" selected={scheduleDate} onSelect={setScheduleDate}
                      disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                      className="rounded-md border w-fit" />
                    <div className="flex items-center gap-2">
                      <select value={scheduleHour} onChange={e => setScheduleHour(e.target.value)}
                        className="rounded-md border border-border bg-background px-2 py-1.5 text-sm">
                        {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0")).map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <span className="text-sm">:</span>
                      <select value={scheduleMin} onChange={e => setScheduleMin(e.target.value)}
                        className="rounded-md border border-border bg-background px-2 py-1.5 text-sm">
                        {["00", "15", "30", "45"].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <Button size="sm" onClick={() => scheduleDraft(d.id)} disabled={!scheduleDate}>Schedule</Button>
                      <Button size="sm" variant="ghost" onClick={() => setSchedulingId(null)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Scheduled */}
      {scheduledItems.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Scheduled</p>
          {scheduledItems.map(d => (
            <DraftCard key={d.id} draft={d} actions={
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => cancelSchedule(d.id)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </>
            } />
          ))}
        </div>
      )}

      {/* Published */}
      {publishedItems.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Published</p>
          {publishedItems.map(d => (
            <DraftCard key={d.id} draft={d} actions={
              <Badge variant={d.status === "published" ? "default" : "destructive"} className="text-[10px]">
                {d.status === "published" ? "Published" : "Failed"}
              </Badge>
            } />
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingDraft} onOpenChange={open => { if (!open) setEditingDraft(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Draft</DialogTitle>
          </DialogHeader>
          <Textarea value={editContent} onChange={e => setEditContent(e.target.value)}
            rows={10} className="text-sm" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingDraft(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// CALENDAR TAB
// ============================================================

function CalendarTab({ drafts, onUpdate }: { drafts: SavedDraft[]; onUpdate: () => void }) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const scheduledDrafts = drafts.filter(d => d.status === "scheduled" && d.scheduled_at);
  const publishedDrafts = drafts.filter(d => d.status === "published" && d.published_at);

  // Dates that have scheduled or published posts
  const markedDates = new Set<string>();
  scheduledDrafts.forEach(d => {
    if (d.scheduled_at) markedDates.add(new Date(d.scheduled_at).toDateString());
  });
  publishedDrafts.forEach(d => {
    if (d.published_at) markedDates.add(new Date(d.published_at).toDateString());
  });

  // Drafts for selected date
  const selectedDateStr = selectedDate?.toDateString();
  const draftsForDate = [
    ...scheduledDrafts.filter(d => d.scheduled_at && new Date(d.scheduled_at).toDateString() === selectedDateStr),
    ...publishedDrafts.filter(d => d.published_at && new Date(d.published_at).toDateString() === selectedDateStr),
  ];

  return (
    <div className="flex gap-6 flex-col sm:flex-row">
      <div className="shrink-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-md border"
          modifiers={{ hasPost: (date) => markedDates.has(date.toDateString()) }}
          modifiersClassNames={{ hasPost: "bg-primary/10 font-semibold" }}
        />
      </div>
      <div className="flex-1 space-y-3">
        <p className="text-sm font-medium">
          {selectedDate ? format(selectedDate, "EEEE, MMM d") : "Select a date"}
        </p>
        {draftsForDate.length === 0 ? (
          <p className="text-sm text-muted-foreground">No posts on this date.</p>
        ) : (
          draftsForDate.map(d => (
            <div key={d.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium capitalize">{d.platform}</span>
                <Badge variant={d.status === "published" ? "default" : "secondary"} className="text-[10px]">
                  {d.status}
                </Badge>
                {d.scheduled_at && d.status === "scheduled" && (
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(d.scheduled_at), "h:mm a")}
                  </span>
                )}
              </div>
              <p className="text-sm line-clamp-2">{d.content.slice(0, 150)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
