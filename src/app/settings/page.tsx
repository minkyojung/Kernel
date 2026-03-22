"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { User, Link2, ChevronRight } from "lucide-react";

interface TokenInfo {
  platform: string;
  username: string;
  expires_at: string;
}

interface ProfileInfo {
  bio: string;
  category: string;
  content_goal: string;
  posting_frequency: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  tech: "Tech / AI", beauty: "Beauty", food: "Food", lifestyle: "Lifestyle",
  fitness: "Fitness", education: "Education", entertainment: "Entertainment",
  business: "Business", travel: "Travel", fashion: "Fashion", other: "Other",
};

const GOAL_LABELS: Record<string, string> = {
  awareness: "Brand Awareness", growth: "Follower Growth",
  conversion: "Conversion", community: "Community",
};

const FREQ_LABELS: Record<string, string> = {
  daily: "Daily", "5_per_week": "5x/wk", "3_per_week": "3x/wk",
  "2_per_week": "2x/wk", weekly: "Weekly",
};

export default function SettingsPage() {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [section, setSection] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/status").then(r => r.json()).then(d => setTokens(d.tokens || [])).catch(() => {});
    fetch("/api/profile").then(r => r.json()).then(d => { if (d.profile?.category) setProfile(d.profile); }).catch(() => {});
  }, []);

  if (section === "profile") return <ProfileChat onBack={() => setSection(null)} />;
  if (section === "accounts") return <ConnectedAccounts tokens={tokens} onBack={() => setSection(null)} />;

  const hasProfile = !!profile;

  return (
    <div className="max-w-lg">
      <p className="text-sm text-muted-foreground mb-6">Manage your profile and connections.</p>

      <div className="space-y-1">
        {/* Profile row with inline summary */}
        <button onClick={() => setSection("profile")} className="w-full flex items-center justify-between px-3 py-3 rounded-md hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <User className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="text-left min-w-0">
              <span className="text-sm block">Profile</span>
              {hasProfile && (
                <span className="text-xs text-muted-foreground block truncate">
                  {CATEGORY_LABELS[profile.category] || profile.category} · {GOAL_LABELS[profile.content_goal] || profile.content_goal} · {FREQ_LABELS[profile.posting_frequency] || profile.posting_frequency}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">{hasProfile ? "Edit" : "Set up"}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </button>

        <SettingsRow icon={<Link2 className="w-4 h-4" />} label="Connected Accounts" detail={`${tokens.length} connected`} onClick={() => setSection("accounts")} />
      </div>
    </div>
  );
}

function SettingsRow({ icon, label, detail, onClick }: { icon: React.ReactNode; label: string; detail: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between px-3 py-3 rounded-md hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{detail}</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </button>
  );
}

// --- Connected Accounts ---
function ConnectedAccounts({ tokens, onBack }: { tokens: TokenInfo[]; onBack: () => void }) {
  return (
    <div className="max-w-lg">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 -ml-2">
        &larr; Settings
      </Button>
      <h1 className="text-xl font-semibold mb-4">Connected Accounts</h1>
      <div className="space-y-2">
        {tokens.map((t) => (
          <div key={t.platform} className="flex items-center justify-between px-3 py-3 rounded-md border border-border">
            <div>
              <p className="text-sm font-medium capitalize">{t.platform}</p>
              <p className="text-xs text-muted-foreground">@{t.username}</p>
            </div>
            <Badge variant="secondary">Connected</Badge>
          </div>
        ))}
        {!tokens.find(t => t.platform === "instagram") && (
          <a href="/api/auth/instagram" className="flex items-center justify-between px-3 py-3 rounded-md border border-dashed border-border hover:bg-muted/50">
            <span className="text-sm">Instagram</span>
            <span className="text-xs text-muted-foreground">Connect &rarr;</span>
          </a>
        )}
        {!tokens.find(t => t.platform === "threads") && (
          <a href="/api/auth/threads" className="flex items-center justify-between px-3 py-3 rounded-md border border-dashed border-border hover:bg-muted/50">
            <span className="text-sm">Threads</span>
            <span className="text-xs text-muted-foreground">Connect &rarr;</span>
          </a>
        )}
      </div>
    </div>
  );
}

// --- Chat-based Profile ---
interface Message {
  role: "ai" | "user";
  text: string;
  options?: { value: string; label: string }[];
  field?: string;
  inputType?: "text" | "textarea" | "select";
}

const CATEGORIES = [
  { value: "tech", label: "Tech / AI" }, { value: "beauty", label: "Beauty" },
  { value: "food", label: "Food" }, { value: "lifestyle", label: "Lifestyle" },
  { value: "fitness", label: "Fitness" }, { value: "education", label: "Education" },
  { value: "entertainment", label: "Entertainment" }, { value: "business", label: "Business" },
  { value: "travel", label: "Travel" }, { value: "fashion", label: "Fashion" },
  { value: "other", label: "Other" },
];

const GOALS = [
  { value: "awareness", label: "Brand Awareness" }, { value: "growth", label: "Follower Growth" },
  { value: "conversion", label: "Conversion" }, { value: "community", label: "Community" },
];

const FORMATS = [
  { value: "reel", label: "Reels" }, { value: "carousel", label: "Carousel" },
  { value: "image", label: "Image" }, { value: "mixed", label: "Mixed" },
];

const FREQUENCIES = [
  { value: "daily", label: "Daily" }, { value: "5_per_week", label: "5x/wk" },
  { value: "3_per_week", label: "3x/wk" }, { value: "2_per_week", label: "2x/wk" },
  { value: "weekly", label: "Weekly" },
];

interface ProfileData {
  bio: string; category: string; content_goal: string; target_audience: string;
  primary_format: string; posting_frequency: string; competitors: string;
}

const FLOW: Omit<Message, "role">[] = [
  { text: "Tell me about yourself \u2014 what kind of content do you create?", field: "bio", inputType: "textarea" },
  { text: "Which category fits best?", field: "category", inputType: "select", options: CATEGORIES },
  { text: "What\u2019s your main goal?", field: "content_goal", inputType: "select", options: GOALS },
  { text: "Who\u2019s your target audience?", field: "target_audience", inputType: "text" },
  { text: "What format do you mostly use?", field: "primary_format", inputType: "select", options: FORMATS },
  { text: "How often do you post?", field: "posting_frequency", inputType: "select", options: FREQUENCIES },
  { text: "Any creators you look up to? (optional)", field: "competitors", inputType: "text" },
];

function ProfileChat({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [flowIndex, setFlowIndex] = useState(0);
  const [input, setInput] = useState("");
  const [profile, setProfile] = useState<ProfileData>({
    bio: "", category: "", content_goal: "", target_audience: "",
    primary_format: "", posting_frequency: "", competitors: "[]",
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.json())
      .then(data => {
        if (data.profile?.category) {
          setProfile(data.profile);
          setMessages([{ role: "ai", text: "Your profile is set up. Chat to update anything, or redo from scratch." }]);
          setDone(true);
        } else {
          setMessages([{ role: "ai", ...FLOW[0] }]);
        }
      })
      .catch(() => setMessages([{ role: "ai", ...FLOW[0] }]))
      .finally(() => setLoadingExisting(false));
  }, []);

  const currentStep = FLOW[flowIndex];

  const handleAnswer = (value: string, label?: string) => {
    if (!currentStep?.field) return;
    const updated = { ...profile, [currentStep.field]: currentStep.field === "competitors" ? JSON.stringify(value.split(/[,\s]+/).map(h => h.replace(/^@/, "").trim()).filter(Boolean)) : value };
    setProfile(updated);

    const newMsgs: Message[] = [...messages, { role: "user", text: label || value }];
    const next = flowIndex + 1;

    if (next < FLOW.length) {
      newMsgs.push({ role: "ai", ...FLOW[next] });
      setMessages(newMsgs);
      setFlowIndex(next);
    } else {
      newMsgs.push({ role: "ai", text: "Saving..." });
      setMessages(newMsgs);
      saveProfile(updated, newMsgs);
    }
    setInput("");
  };

  const saveProfile = async (p: ProfileData, msgs: Message[]) => {
    setSaving(true);
    try {
      await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
      const summaryRes = await fetch("/api/profile/summary", { method: "POST" });
      const { summary } = await summaryRes.json();
      setMessages([...msgs.slice(0, -1), { role: "ai", text: summary || "Profile saved!" }]);
      setDone(true);
    } catch {
      setMessages([...msgs.slice(0, -1), { role: "ai", text: "Failed to save. Try again?" }]);
    } finally {
      setSaving(false);
    }
  };

  if (loadingExisting) return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-lg flex flex-col h-[calc(100vh-7rem)]">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-2 -ml-2 w-fit">
        &larr; Settings
      </Button>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}>
              {msg.role === "ai" ? (
                <div className="space-y-0.5">
                  {msg.text.split("\n").map((line, j) => {
                    if (line.startsWith("## ")) return <p key={j} className="font-semibold mt-2 first:mt-0">{line.replace("## ", "")}</p>;
                    if (line.startsWith("- ")) return <p key={j} className="ml-3 text-muted-foreground text-xs">{line}</p>;
                    if (!line.trim()) return <div key={j} className="h-1" />;
                    return <p key={j}>{line}</p>;
                  })}
                </div>
              ) : msg.text}
            </div>
          </div>
        ))}

        {/* Option pills */}
        {!done && currentStep?.options && (
          <div className="flex flex-wrap gap-1.5 pl-1">
            {currentStep.options.map((opt) => (
              <button key={opt.value} onClick={() => handleAnswer(opt.value, opt.label)}
                className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors">
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {saving && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-2.5 text-sm text-muted-foreground animate-pulse">Analyzing...</div>
          </div>
        )}
      </div>

      <Separator />

      {/* Input */}
      {!done ? (
        <div className="pt-3 pb-1">
          {(currentStep?.inputType === "text" || currentStep?.inputType === "textarea") ? (
            <div className="flex gap-2">
              {currentStep.inputType === "textarea" ? (
                <textarea
                  value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (input.trim()) handleAnswer(input.trim()); } }}
                  placeholder="Type here..." rows={2} autoFocus
                  className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              ) : (
                <input
                  value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (input.trim()) handleAnswer(input.trim()); } }}
                  placeholder={currentStep.field === "competitors" ? "@handle1, @handle2" : "Type here..."} autoFocus
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              )}
              <Button size="sm" onClick={() => input.trim() && handleAnswer(input.trim())} disabled={!input.trim()}>Send</Button>
              {(currentStep.field === "competitors" || currentStep.field === "target_audience") && (
                <Button size="sm" variant="ghost" onClick={() => handleAnswer(currentStep.field === "competitors" ? "[]" : "", "Skipped")}>Skip</Button>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground px-1">Pick an option above</p>
          )}
        </div>
      ) : (
        <div className="pt-3 pb-1 flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => { setDone(false); setFlowIndex(0); setMessages([{ role: "ai", ...FLOW[0] }]); }}>Redo</Button>
          <Button size="sm" onClick={() => window.location.href = "/"}>Dashboard</Button>
        </div>
      )}
    </div>
  );
}
