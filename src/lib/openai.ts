import OpenAI from "openai";
import { type ProfileRow, type ContentPatternRow } from "./db";
import { type MediaWithInsight, engagementRate } from "./metrics";

const MODEL = "gpt-4o";

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  return new OpenAI({ apiKey });
}

async function chat(system: string, user: string): Promise<string> {
  const client = getClient();
  const res = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.8,
    max_tokens: 2048,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return res.choices[0]?.message?.content ?? "";
}

async function chatJSON<T>(system: string, user: string): Promise<T> {
  const client = getClient();
  const res = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.8,
    max_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const text = res.choices[0]?.message?.content ?? "{}";
  return JSON.parse(text) as T;
}

// --- Profile Context ---

function profileContext(profile: ProfileRow): string {
  const competitors = JSON.parse(profile.competitors || "[]") as string[];
  return [
    `Bio: ${profile.bio || "not set"}`,
    `Category: ${profile.category}`,
    `Goal: ${profile.content_goal}`,
    `Target audience: ${profile.target_audience || "not set"}`,
    `Format: ${profile.primary_format}`,
    `Frequency: ${profile.posting_frequency}`,
    competitors.length > 0 ? `References: ${competitors.map((c) => "@" + c).join(", ")}` : "",
  ].filter(Boolean).join("\n");
}

function performanceContext(
  patterns: ContentPatternRow[],
  topPosts: MediaWithInsight[],
): string {
  if (patterns.length === 0 && topPosts.length === 0) return "";

  const lines: string[] = ["## What works for this creator"];

  if (patterns.length > 0) {
    lines.push("Patterns:");
    for (const p of patterns) {
      lines.push(`- [${p.pattern_type}] ${p.pattern}`);
    }
  }

  if (topPosts.length > 0) {
    lines.push("", "Top posts (match this voice):");
    for (const m of topPosts) {
      const er = engagementRate(m).toFixed(1);
      lines.push(`- ER ${er}% | "${(m.caption || "").slice(0, 150)}"`);
    }
  }

  return lines.join("\n");
}

// --- Threads Post Generation ---

const THREADS_SYSTEM = `You are a social media ghostwriter who specializes in Threads (by Meta).

Your job: turn source material into a short, punchy Threads post that sounds like the creator wrote it casually.

## Threads Platform Rules (MUST follow)
1. MAX 280 characters. Shorter = better. Under 200 is ideal.
2. NO links. NO URLs. NO "source: ..." NO "according to..."
3. NO hashtags unless the creator's style uses them. If used, max 1.
4. NO thread chains or numbered lists. Single post only.
5. NO emojis unless they add meaning. Never more than 1-2.
6. Write in ENGLISH (global audience).

## Threads Content Formula
- Lead with a HOT TAKE or surprising opinion — not a summary
- Use the creator's natural voice — casual, like texting a smart friend
- One idea per post. Don't try to explain everything.
- End with a question OR a provocative statement that invites replies
- If the source is technical, make it accessible without dumbing it down

## What makes Threads posts go viral
- Strong opinion that people want to agree or disagree with
- "I just realized..." or "Hot take:" energy
- Saying what people are thinking but haven't articulated
- Contrarian takes backed by a clear reason

## What KILLS Threads posts
- Sounding like a press release or news summary
- "Here are 5 things about X..." listicle energy
- Generic motivational content
- Over-explaining. Trust the audience to be smart.`;

export async function generateThreadsPost(
  profile: ProfileRow,
  source: { source_type: string; title: string; raw_data: string },
  options?: { patterns?: ContentPatternRow[]; topPosts?: MediaWithInsight[] },
): Promise<{ title: string; content: string }> {
  const perfCtx = options
    ? performanceContext(options.patterns || [], options.topPosts || [])
    : "";

  const user = `## Creator Profile
${profileContext(profile)}
${perfCtx ? "\n" + perfCtx + "\n" : ""}
## Source Material
Type: ${source.source_type}
Title: ${source.title}
Data: ${source.raw_data}

Write a single Threads post. Return JSON with "title" (short English label, max 50 chars) and "content" (the post text, max 280 chars).`;

  const result = await chatJSON<{ title: string; content: string }>(THREADS_SYSTEM, user);
  return {
    title: result.title || source.title.slice(0, 50),
    content: result.content || "",
  };
}

// --- Multi-platform Draft Generation (for Create tab) ---

const DRAFTS_SYSTEM = `You are a multi-platform content strategist who creates social media drafts.

You write for two platforms with very different styles:

### Instagram (Carousel / Reel)
- Carousels: Hook slide → 3-4 info slides → CTA slide. Caption with context.
- Reels: Hook (0-3s) → Body (3-30s script) → CTA. Caption with hashtags.
- Can be longer, more educational, more polished
- 3-5 relevant hashtags in caption

### Threads
- MAX 280 characters. Single post.
- Hot take / opinion first. No links, no sources cited.
- Casual voice, like texting a friend
- 0-1 hashtags max
- End with a question or provocative statement

ALWAYS write in English. Global audience.`;

export async function generateMultiPlatformDrafts(
  profile: ProfileRow,
  sourceType: "news" | "github",
  sourceContent: string,
  options?: { patterns?: ContentPatternRow[]; topPosts?: MediaWithInsight[] },
): Promise<string> {
  const perfCtx = options
    ? performanceContext(options.patterns || [], options.topPosts || [])
    : "";

  const user = `## Creator Profile
${profileContext(profile)}
${perfCtx ? "\n" + perfCtx + "\n" : ""}
## Source (${sourceType === "news" ? "Tech News" : "GitHub Activity"})
${sourceContent}

Create 3 drafts from this source:

## Draft 1: Instagram Carousel
- **Hook (Slide 1):** [scroll-stopping one-liner]
- **Slide 2:** [key insight 1]
- **Slide 3:** [key insight 2]
- **Slide 4:** [key insight 3]
- **Slide 5 (CTA):** [call to action]
- **Caption:** [with 3-5 hashtags]

## Draft 2: Instagram Reel Script
- **Hook (0-3s):** [attention grab]
- **Body (3-30s):** [core content, conversational]
- **CTA:** [follow/save prompt]
- **Caption:** [with hashtags]

## Draft 3: Threads Post
[Single post, max 280 chars. Hot take, no links, casual voice. 0-1 hashtag.]

Rules:
- Match the creator's voice and angle
- Each draft should approach the source from a DIFFERENT angle
- Threads draft must be drastically shorter than Instagram drafts
${perfCtx ? "- Reflect the performance patterns in tone and structure" : ""}`;

  return chat(DRAFTS_SYSTEM, user);
}
