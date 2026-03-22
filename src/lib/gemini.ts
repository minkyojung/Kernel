import { type ProfileRow } from "./db";
import { type MediaWithInsight, engagementRate, saveRate } from "./metrics";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

async function callGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const res = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${err}`);
  }

  const data = (await res.json()) as GeminiResponse;
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function buildProfileContext(profile: ProfileRow): string {
  const competitors = JSON.parse(profile.competitors || "[]") as string[];
  return `
## Creator Profile
- Category: ${profile.category}
- Content Goal: ${profile.content_goal}
- Target Audience: ${profile.target_audience || "Not specified"}
- Primary Format: ${profile.primary_format}
- Posting Frequency: ${profile.posting_frequency}
- Reference Accounts: ${competitors.length > 0 ? competitors.map((c) => "@" + c).join(", ") : "None"}
- Bio: ${profile.bio || "Not provided"}
`.trim();
}

function buildMediaContext(media: MediaWithInsight[]): string {
  if (media.length === 0) return "No posts yet.";

  const summary = media.slice(0, 20).map((m, i) => {
    const er = engagementRate(m).toFixed(1);
    const sr = saveRate(m).toFixed(1);
    return `${i + 1}. [${m.media_type}] ${m.timestamp.slice(0, 10)} | Reach: ${m.reach ?? 0} | Likes: ${m.insight_likes ?? m.like_count} | Saved: ${m.saved ?? 0} | Comments: ${m.insight_comments ?? m.comments_count} | Shares: ${m.shares ?? 0} | ER: ${er}% | SR: ${sr}% | Caption: "${(m.caption || "").slice(0, 100)}"`;
  });

  const totalReach = media.reduce((s, m) => s + (m.reach ?? 0), 0);
  const avgER =
    media.reduce((s, m) => s + engagementRate(m), 0) / media.length;
  const avgSR = media.reduce((s, m) => s + saveRate(m), 0) / media.length;

  return `
## Performance Summary (${media.length} posts)
- Total Reach: ${totalReach}
- Average Engagement Rate: ${avgER.toFixed(1)}%
- Average Save Rate: ${avgSR.toFixed(1)}%

## Recent Posts
${summary.join("\n")}
`.trim();
}

export async function analyzeStrategy(profile: ProfileRow): Promise<string> {
  const prompt = `You are an expert social media strategist specializing in Instagram and Threads content.

${buildProfileContext(profile)}

This creator has NO posts yet. Based on their profile, provide a personalized first content strategy.

Respond in Korean. Structure your response as:

## 니치 분석
[Brief analysis of this category's Instagram/Threads landscape]

## 첫 3개 콘텐츠 제안
[For each: format, topic, hook idea, and why it works for this niche]

## 목표 KPI
[Realistic benchmark targets for this category: engagement rate, save rate, reach]

## 포스팅 전략
[Optimal posting schedule, best times, consistency tips]

Be specific and actionable. Avoid generic advice.`;

  return callGemini(prompt);
}

export async function analyzePerformance(
  profile: ProfileRow,
  media: MediaWithInsight[],
): Promise<string> {
  const prompt = `You are an expert social media analyst specializing in Instagram and Threads content performance.

${buildProfileContext(profile)}

${buildMediaContext(media)}

Analyze this creator's content performance and provide actionable insights.

Respond in Korean. Structure your response as:

## 성과 요약
[Overall performance trend, strengths, weaknesses]

## 패턴 분석
[Which format/topic/style performs best and why]

## 개선 포인트
[Specific, data-backed suggestions to improve. Reference actual posts.]

## 다음 콘텐츠 제안
[3 specific content ideas based on what's working + profile goals]

Be specific and reference actual data. Avoid generic advice.`;

  return callGemini(prompt);
}
