"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "tech", label: "Tech / AI" },
  { value: "beauty", label: "Beauty / Skincare" },
  { value: "food", label: "Food / Cooking" },
  { value: "lifestyle", label: "Lifestyle / Daily" },
  { value: "fitness", label: "Fitness / Health" },
  { value: "education", label: "Education / Tips" },
  { value: "entertainment", label: "Entertainment" },
  { value: "business", label: "Business / Startup" },
  { value: "travel", label: "Travel" },
  { value: "fashion", label: "Fashion / Style" },
  { value: "other", label: "Other" },
];

const GOALS = [
  { value: "awareness", label: "Brand Awareness", desc: "Reach more people and grow visibility" },
  { value: "growth", label: "Follower Growth", desc: "Grow your audience and engagement" },
  { value: "conversion", label: "Conversion", desc: "Drive traffic, sales, or signups" },
  { value: "community", label: "Community", desc: "Build deeper connections with your audience" },
];

const FORMATS = [
  { value: "reel", label: "Reels" },
  { value: "carousel", label: "Carousel" },
  { value: "image", label: "Single Image" },
  { value: "mixed", label: "Mixed" },
];

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "5_per_week", label: "5x / week" },
  { value: "3_per_week", label: "3x / week" },
  { value: "2_per_week", label: "2x / week" },
  { value: "weekly", label: "Weekly" },
];

interface Profile {
  category: string;
  target_audience: string;
  content_goal: string;
  primary_format: string;
  posting_frequency: string;
  competitors: string;
  bio: string;
}

const TOTAL_STEPS = 5;

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile>({
    category: "",
    target_audience: "",
    content_goal: "growth",
    primary_format: "mixed",
    posting_frequency: "3_per_week",
    competitors: "[]",
    bio: "",
  });
  const [competitorInput, setCompetitorInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [isExisting, setIsExisting] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.profile && data.profile.category) {
          setProfile(data.profile);
          setIsExisting(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const competitors: string[] = (() => {
    try {
      return JSON.parse(profile.competitors);
    } catch {
      return [];
    }
  })();

  const addCompetitor = () => {
    const handle = competitorInput.trim().replace(/^@/, "");
    if (!handle) return;
    if (competitors.includes(handle)) {
      toast.error("Already added");
      return;
    }
    if (competitors.length >= 5) {
      toast.error("Max 5 accounts");
      return;
    }
    const updated = [...competitors, handle];
    setProfile({ ...profile, competitors: JSON.stringify(updated) });
    setCompetitorInput("");
  };

  const removeCompetitor = (handle: string) => {
    const updated = competitors.filter((c) => c !== handle);
    setProfile({ ...profile, competitors: JSON.stringify(updated) });
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return !!profile.bio.trim();
      case 1: return !!profile.category;
      case 2: return !!profile.content_goal;
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  };

  const handleSave = async () => {
    if (!profile.bio.trim()) {
      toast.error("Please describe your content");
      return;
    }
    if (!profile.category) {
      toast.error("Please select a category");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Profile saved");
      setIsExisting(true);

      setSummarizing(true);
      try {
        const analyzeRes = await fetch("/api/profile/summary", { method: "POST" });
        const analyzeData = await analyzeRes.json();
        if (analyzeData.summary) {
          setAiSummary(analyzeData.summary);
        }
      } catch {
        // AI summary is optional
      } finally {
        setSummarizing(false);
      }
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading...
      </div>
    );
  }

  // Existing user: compact edit form
  if (isExisting && step === 0 && !aiSummary) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile Settings</h1>
          <p className="text-sm text-muted-foreground">
            AI uses this to generate personalized content strategy and performance analysis.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-2">
            <Label className="text-sm font-medium">About You</Label>
            <p className="text-xs text-muted-foreground">
              Describe your content and style. This is the most important input for AI analysis.
            </p>
            <Textarea
              placeholder="e.g., I review AI tools and productivity apps. I like breaking down complex concepts into simple explanations with minimal editing style."
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              rows={3}
            />
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="pt-6 space-y-2">
              <Label className="text-sm font-medium">Category</Label>
              <Select
                value={profile.category}
                onValueChange={(v) => v && setProfile({ ...profile, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 space-y-2">
              <Label className="text-sm font-medium">Content Goal</Label>
              <Select
                value={profile.content_goal}
                onValueChange={(v) => v && setProfile({ ...profile, content_goal: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOALS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-2">
            <Label className="text-sm font-medium">Target Audience</Label>
            <Input
              placeholder="e.g., 20-30s developers interested in productivity"
              value={profile.target_audience}
              onChange={(e) => setProfile({ ...profile, target_audience: e.target.value })}
            />
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="pt-6 space-y-2">
              <Label className="text-sm font-medium">Primary Format</Label>
              <Select
                value={profile.primary_format}
                onValueChange={(v) => v && setProfile({ ...profile, primary_format: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 space-y-2">
              <Label className="text-sm font-medium">Posting Frequency</Label>
              <Select
                value={profile.posting_frequency}
                onValueChange={(v) => v && setProfile({ ...profile, posting_frequency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <Label className="text-sm font-medium">Reference Accounts (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Add creators you want to benchmark against. AI will use these as references.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="@username"
                value={competitorInput}
                onChange={(e) => setCompetitorInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCompetitor(); } }}
              />
              <Button variant="outline" onClick={addCompetitor}>Add</Button>
            </div>
            {competitors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {competitors.map((c) => (
                  <Badge key={c} variant="secondary" className="cursor-pointer gap-1" onClick={() => removeCompetitor(c)}>
                    @{c} &times;
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </div>
    );
  }

  // AI Summary after save
  if (aiSummary) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile Review</h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s how AI understands your profile. Edit if something doesn&apos;t look right.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {aiSummary.split("\n").map((line, i) => {
                if (line.startsWith("## ")) {
                  return <h3 key={i} className="mt-4 mb-2 text-base font-semibold first:mt-0">{line.replace("## ", "")}</h3>;
                }
                if (line.startsWith("- ")) {
                  return <p key={i} className="ml-4 my-0.5 text-muted-foreground">{line}</p>;
                }
                if (line.trim() === "") return <div key={i} className="h-2" />;
                return <p key={i} className="my-0.5 text-muted-foreground">{line}</p>;
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => { setAiSummary(null); setIsExisting(true); }}>
            Edit Profile
          </Button>
          <Button onClick={() => window.location.href = "/"}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // New user: step-by-step onboarding
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <p className="text-xs text-muted-foreground mb-1">
          {step + 1} / {TOTAL_STEPS}
        </p>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {/* Step 0: Bio (most important) */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              What kind of content do you create?
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Describe freely. AI will use this to build your personalized strategy.
            </p>
          </div>
          <Textarea
            placeholder={"Examples:\n• Tech creator who reviews AI tools and productivity apps\n• Self-improvement content for working professionals\n• Cafe hopping and dessert reviews"}
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            rows={5}
            className="text-base"
          />
          {profile.bio.trim() && (
            <p className="text-xs text-emerald-500">
              The more specific you are, the better AI recommendations you&apos;ll get.
            </p>
          )}
        </div>
      )}

      {/* Step 1: Category */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Which category fits best?
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pick the closest match for your content.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setProfile({ ...profile, category: c.value })}
                className={`rounded-lg border p-4 text-left text-sm transition-colors ${
                  profile.category === c.value
                    ? "border-primary bg-primary/5 font-medium"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Content Goal */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              What&apos;s your primary goal?
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI will tailor KPIs and strategy to this goal.
            </p>
          </div>
          <RadioGroup
            value={profile.content_goal}
            onValueChange={(v) => setProfile({ ...profile, content_goal: v })}
            className="space-y-3"
          >
            {GOALS.map((g) => (
              <Label
                key={g.value}
                htmlFor={`goal-${g.value}`}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                  profile.content_goal === g.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value={g.value} id={`goal-${g.value}`} className="mt-0.5" />
                <div>
                  <p className="font-medium">{g.label}</p>
                  <p className="text-xs text-muted-foreground">{g.desc}</p>
                </div>
              </Label>
            ))}
          </RadioGroup>
        </div>
      )}

      {/* Step 3: Format + Frequency + Audience */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Content Style
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your preferred format, posting frequency, and target audience.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Primary Format</Label>
            <div className="grid grid-cols-2 gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setProfile({ ...profile, primary_format: f.value })}
                  className={`rounded-lg border p-3 text-sm transition-colors ${
                    profile.primary_format === f.value
                      ? "border-primary bg-primary/5 font-medium"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Posting Frequency</Label>
            <div className="grid grid-cols-3 gap-2">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setProfile({ ...profile, posting_frequency: f.value })}
                  className={`rounded-lg border p-3 text-sm transition-colors ${
                    profile.posting_frequency === f.value
                      ? "border-primary bg-primary/5 font-medium"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Target Audience</Label>
            <Input
              placeholder="e.g., 20-30s developers, designers"
              value={profile.target_audience}
              onChange={(e) => setProfile({ ...profile, target_audience: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* Step 4: Reference Accounts */}
      {step === 4 && (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Reference Accounts (optional)
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Add creators you admire or want to benchmark against. Skip if none.
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="@username"
              value={competitorInput}
              onChange={(e) => setCompetitorInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCompetitor(); } }}
            />
            <Button variant="outline" onClick={addCompetitor}>Add</Button>
          </div>
          {competitors.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {competitors.map((c) => (
                <Badge key={c} variant="secondary" className="cursor-pointer gap-1" onClick={() => removeCompetitor(c)}>
                  @{c} &times;
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          variant="ghost"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
        >
          Back
        </Button>
        {step < TOTAL_STEPS - 1 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
          >
            Next
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving || !canProceed()}>
            {saving ? (summarizing ? "Analyzing..." : "Saving...") : "Done"}
          </Button>
        )}
      </div>
    </div>
  );
}
