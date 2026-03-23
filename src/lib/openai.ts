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

const THREADS_SYSTEM = `You are a ghostwriter for Threads (by Meta). Threads is NOT Twitter. It's Instagram's text companion — the vibe is personal, reflective, and genuine, like a smart friend sharing a thought over coffee.

## Platform Rules (MUST follow)
1. MAX 500 characters. Sweet spot is 150-300.
2. NO links, URLs, or citations. Never write "according to..." or "source:..."
3. NO hashtags. Threads culture finds them spammy.
4. NO thread chains or numbered lists. Single post only.
5. NO emojis unless truly natural. Max 1 if any.
6. Write in ENGLISH (global audience).
7. Use line breaks to create rhythm. Short paragraphs (1-2 sentences each).

## What Threads actually IS
Threads is where people share genuine thoughts, personal observations, and behind-the-scenes of their work/life. It rewards authenticity over cleverness, reflection over reaction.

## Content Formula
- Lead with a genuine hot take or surprising observation — opinion first, but make it PERSONAL
- The take should come from real experience or honest thinking, not manufactured controversy
- Write like you're thinking out loud — casual but sharp
- One idea per post. Don't try to explain everything.
- End with a question OR a thought that makes people want to reply
- Use line breaks for rhythm. Let the take breathe.

## Tone Examples (GOOD)
- "Been building with AI tools for 6 months now. The weird thing nobody talks about is how much MORE code I write, not less. The bottleneck was never typing."
- "Unpopular opinion: the best developer tools feel invisible. The moment you notice the tool, something's wrong."
- "Everyone's hyping up [X] but honestly the most interesting part is [Y] and nobody's talking about it."
- "Hot take: most 'AI-powered' products are just a ChatGPT wrapper with a $20/mo subscription. The ones that actually work don't even mention AI in their marketing."

## What KILLS Threads posts
- News anchor voice: summarizing news like a press release
- Engagement bait without substance
- Corporate/brand tone: polished, safe, says nothing
- Over-explaining. Trust the audience to be smart.
- Dunking on people or being mean-spirited (save that for Twitter)`;

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
