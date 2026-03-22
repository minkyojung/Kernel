"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  { value: "tech", label: "Tech" },
  { value: "beauty", label: "Beauty" },
  { value: "food", label: "Food" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "fitness", label: "Fitness" },
  { value: "education", label: "Education" },
  { value: "entertainment", label: "Entertainment" },
  { value: "business", label: "Business" },
  { value: "travel", label: "Travel" },
  { value: "fashion", label: "Fashion" },
  { value: "other", label: "Other" },
];

const GOALS = [
  { value: "awareness", label: "Brand Awareness", desc: "Maximize reach and impressions" },
  { value: "growth", label: "Follower Growth", desc: "Grow audience size and engagement" },
  { value: "conversion", label: "Conversion", desc: "Drive traffic, sales, or signups" },
  { value: "community", label: "Community", desc: "Build deeper engagement and loyalty" },
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

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          setProfile(data.profile);
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
      toast.error("Max 5 competitors");
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

  const handleSave = async () => {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Define your creator profile for personalized analytics and AI recommendations.
        </p>
      </div>

      {!profile.category && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <p className="text-sm font-medium mb-1">Quick Start Guide</p>
            <p className="text-xs text-muted-foreground">
              Fill in at least <strong>Category</strong> and <strong>Content Goal</strong> to get AI-powered content strategy.
              The more you fill in, the more personalized the recommendations.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Category / Niche</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={profile.category}
            onValueChange={(v) => v && setProfile({ ...profile, category: v })}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select your niche" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Content Goal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Content Goal</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={profile.content_goal}
            onValueChange={(v) => setProfile({ ...profile, content_goal: v })}
            className="grid gap-3 sm:grid-cols-2"
          >
            {GOALS.map((g) => (
              <Label
                key={g.value}
                htmlFor={g.value}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                  profile.content_goal === g.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value={g.value} id={g.value} className="mt-0.5" />
                <div>
                  <p className="font-medium">{g.label}</p>
                  <p className="text-xs text-muted-foreground">{g.desc}</p>
                </div>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Target Audience */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Target Audience</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="예: 20-30대 한국 여성, 스킨케어에 관심 / 개발자, 생산성에 관심"
            value={profile.target_audience}
            onChange={(e) =>
              setProfile({ ...profile, target_audience: e.target.value })
            }
          />
        </CardContent>
      </Card>

      {/* Primary Format & Posting Frequency */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Primary Format</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={profile.primary_format}
              onValueChange={(v) =>
                v && setProfile({ ...profile, primary_format: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMATS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Posting Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={profile.posting_frequency}
              onValueChange={(v) =>
                v && setProfile({ ...profile, posting_frequency: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Reference / Competitor Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reference Accounts</CardTitle>
          <p className="text-xs text-muted-foreground">
            Add up to 5 accounts you want to benchmark against.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="@username"
              value={competitorInput}
              onChange={(e) => setCompetitorInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCompetitor();
                }
              }}
            />
            <Button variant="outline" onClick={addCompetitor}>
              Add
            </Button>
          </div>
          {competitors.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {competitors.map((c) => (
                <Badge
                  key={c}
                  variant="secondary"
                  className="cursor-pointer gap-1"
                  onClick={() => removeCompetitor(c)}
                >
                  @{c} &times;
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About You</CardTitle>
          <p className="text-xs text-muted-foreground">
            Brief description of your content and style. AI will use this for personalized analysis.
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="예: 생산성 도구와 가젯을 리뷰하는 테크 크리에이터. 미니멀하고 정보 중심의 스타일. / 일상 브이로그와 카페 탐방 콘텐츠를 만듦."
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </div>
  );
}
