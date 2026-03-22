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
  { value: "awareness", label: "브랜드 인지도", desc: "더 많은 사람에게 도달하고 싶어요" },
  { value: "growth", label: "팔로워 성장", desc: "오디언스를 키우고 참여를 높이고 싶어요" },
  { value: "conversion", label: "전환/매출", desc: "트래픽, 매출, 가입을 유도하고 싶어요" },
  { value: "community", label: "커뮤니티", desc: "깊은 소통과 충성 팬을 만들고 싶어요" },
];

const FORMATS = [
  { value: "reel", label: "릴스 (Reels)" },
  { value: "carousel", label: "캐러셀 (Carousel)" },
  { value: "image", label: "이미지 (Single Image)" },
  { value: "mixed", label: "혼합 (Mixed)" },
];

const FREQUENCIES = [
  { value: "daily", label: "매일" },
  { value: "5_per_week", label: "주 5회" },
  { value: "3_per_week", label: "주 3회" },
  { value: "2_per_week", label: "주 2회" },
  { value: "weekly", label: "주 1회" },
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
      toast.error("이미 추가된 계정입니다");
      return;
    }
    if (competitors.length >= 5) {
      toast.error("최대 5개까지 추가 가능합니다");
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
      case 3: return true; // format + frequency have defaults
      case 4: return true; // reference accounts optional
      default: return false;
    }
  };

  const handleSave = async () => {
    if (!profile.bio.trim()) {
      toast.error("자기소개를 작성해주세요");
      return;
    }
    if (!profile.category) {
      toast.error("카테고리를 선택해주세요");
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
      toast.success("프로필이 저장되었습니다");
      setIsExisting(true);

      // Generate AI summary
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
      toast.error("저장에 실패했습니다");
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

  // Existing user: show all fields at once with edit mode
  if (isExisting && step === 0 && !aiSummary) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">프로필 설정</h1>
          <p className="text-sm text-muted-foreground">
            AI가 이 정보를 기반으로 맞춤형 콘텐츠 전략과 성과 분석을 제공합니다.
          </p>
        </div>

        {/* Bio */}
        <Card>
          <CardContent className="pt-6 space-y-2">
            <Label className="text-sm font-medium">나는 어떤 크리에이터인가요?</Label>
            <p className="text-xs text-muted-foreground">
              어떤 콘텐츠를 만들고, 어떤 스타일인지 자유롭게 적어주세요. 이 정보가 AI 분석의 핵심입니다.
            </p>
            <Textarea
              placeholder="예: AI와 생산성 도구를 리뷰하는 테크 크리에이터. 복잡한 개념을 쉽게 설명하는 걸 좋아하고, 미니멀한 편집 스타일."
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Category + Goal row */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="pt-6 space-y-2">
              <Label className="text-sm font-medium">카테고리</Label>
              <Select
                value={profile.category}
                onValueChange={(v) => v && setProfile({ ...profile, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="선택" />
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
              <Label className="text-sm font-medium">콘텐츠 목표</Label>
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

        {/* Target Audience */}
        <Card>
          <CardContent className="pt-6 space-y-2">
            <Label className="text-sm font-medium">타겟 오디언스</Label>
            <Input
              placeholder="예: 20-30대 한국 남성, 개발자/디자이너, 생산성에 관심"
              value={profile.target_audience}
              onChange={(e) => setProfile({ ...profile, target_audience: e.target.value })}
            />
          </CardContent>
        </Card>

        {/* Format + Frequency row */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="pt-6 space-y-2">
              <Label className="text-sm font-medium">주력 포맷</Label>
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
              <Label className="text-sm font-medium">포스팅 빈도 목표</Label>
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

        {/* Reference Accounts */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <Label className="text-sm font-medium">레퍼런스 계정 (선택)</Label>
            <p className="text-xs text-muted-foreground">
              벤치마크하고 싶은 크리에이터 계정을 추가하면 AI가 참고합니다.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="@username"
                value={competitorInput}
                onChange={(e) => setCompetitorInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCompetitor(); } }}
              />
              <Button variant="outline" onClick={addCompetitor}>추가</Button>
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
            {saving ? "저장 중..." : "프로필 저장"}
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
          <h1 className="text-2xl font-bold tracking-tight">프로필 확인</h1>
          <p className="text-sm text-muted-foreground">
            AI가 프로필을 이렇게 이해했습니다. 맞지 않으면 수정해주세요.
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
            수정하기
          </Button>
          <Button onClick={() => window.location.href = "/"}>
            대시보드로 이동
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
              어떤 콘텐츠를 만드시나요?
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              자유롭게 적어주세요. AI가 이 정보를 바탕으로 맞춤형 전략을 만들어드립니다.
            </p>
          </div>
          <Textarea
            placeholder={"예시:\n• AI 뉴스와 툴 리뷰를 쉽게 설명하는 테크 크리에이터\n• 직장인을 위한 자기계발/생산성 콘텐츠\n• 카페 탐방과 디저트 리뷰 전문"}
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            rows={5}
            className="text-base"
          />
          {profile.bio.trim() && (
            <p className="text-xs text-emerald-500">
              좋아요! 구체적일수록 AI가 더 정확한 전략을 제안합니다.
            </p>
          )}
        </div>
      )}

      {/* Step 1: Category */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              어떤 카테고리에 해당하나요?
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              가장 가까운 카테고리를 선택해주세요.
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
              가장 중요한 목표는?
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI가 이 목표에 맞춰 KPI와 전략을 설정합니다.
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
              콘텐츠 스타일
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              주로 사용하는 포맷과 포스팅 빈도를 알려주세요.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">주력 포맷</Label>
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
            <Label className="text-sm font-medium">포스팅 빈도 목표</Label>
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
            <Label className="text-sm font-medium">타겟 오디언스</Label>
            <Input
              placeholder="예: 20-30대 한국 남성, 개발자/디자이너"
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
              레퍼런스 계정 (선택)
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              벤치마크하고 싶은 크리에이터가 있으면 추가해주세요. 없으면 바로 완료해도 됩니다.
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="@username"
              value={competitorInput}
              onChange={(e) => setCompetitorInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCompetitor(); } }}
            />
            <Button variant="outline" onClick={addCompetitor}>추가</Button>
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
          이전
        </Button>
        {step < TOTAL_STEPS - 1 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
          >
            다음
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving || !canProceed()}>
            {saving ? (summarizing ? "AI 분석 중..." : "저장 중...") : "완료"}
          </Button>
        )}
      </div>
    </div>
  );
}
