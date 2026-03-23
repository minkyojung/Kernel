import { type ProfileRow, type ContentPatternRow } from "./db";
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

const GOAL_MAP: Record<string, string> = {
  awareness: "브랜드 인지도 확대 (더 많은 사람에게 도달)",
  growth: "팔로워 성장 (오디언스 확대, 참여 증가)",
  conversion: "전환/매출 유도 (트래픽, 구매, 가입)",
  community: "커뮤니티 구축 (깊은 소통, 충성 팬)",
};

const FORMAT_MAP: Record<string, string> = {
  reel: "릴스 (숏폼 영상)",
  carousel: "캐러셀 (슬라이드)",
  image: "이미지 (단일)",
  mixed: "혼합 (다양한 포맷)",
};

const FREQ_MAP: Record<string, string> = {
  daily: "매일",
  "5_per_week": "주 5회",
  "3_per_week": "주 3회",
  "2_per_week": "주 2회",
  weekly: "주 1회",
};

function buildProfileContext(profile: ProfileRow): string {
  const competitors = JSON.parse(profile.competitors || "[]") as string[];
  return `
## 크리에이터 프로필
- 자기소개: ${profile.bio || "미작성"}
- 카테고리: ${profile.category}
- 콘텐츠 목표: ${GOAL_MAP[profile.content_goal] || profile.content_goal}
- 타겟 오디언스: ${profile.target_audience || "미지정"}
- 주력 포맷: ${FORMAT_MAP[profile.primary_format] || profile.primary_format}
- 포스팅 빈도 목표: ${FREQ_MAP[profile.posting_frequency] || profile.posting_frequency}
- 레퍼런스 계정: ${competitors.length > 0 ? competitors.map((c) => "@" + c).join(", ") + " (이 계정들의 공개적으로 알려진 콘텐츠 전략과 스타일을 참고하여 분석하세요)" : "없음"}
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
  const prompt = `당신은 한국 인스타그램/스레드 시장에 정통한 소셜 미디어 전략가입니다.

${buildProfileContext(profile)}

이 크리에이터는 아직 게시글이 없습니다. 프로필 정보를 바탕으로 맞춤형 첫 콘텐츠 전략을 제안해주세요.

중요: "자기소개" 필드를 특히 주의 깊게 읽고, 이 크리에이터만의 고유한 특성을 반영하세요. 일반적인 카테고리 조언이 아니라, 이 사람에게 맞는 구체적 조언을 하세요.

다음 구조로 답변하세요:

## 니치 분석
[이 크리에이터의 니치가 한국 인스타그램/스레드에서 어떤 위치에 있는지. 경쟁 강도, 기회, 차별화 포인트]

## 첫 3개 콘텐츠 제안
[각 제안에 대해: 포맷, 구체적 주제, 첫 문장(Hook), 이 니치에서 왜 효과적인지 설명. 크리에이터의 자기소개에 맞는 스타일로]

## 목표 KPI
[이 카테고리의 한국 시장 현실적 벤치마크: 참여율, 저장률, 도달 수. 초기 목표와 3개월 후 목표를 구분]

## 포스팅 전략
[최적 포스팅 시간(한국 기준), 일관성 유지 방법, 초기 성장을 위한 구체적 팁]

구체적이고 실행 가능한 조언만 하세요. "좋은 콘텐츠를 만드세요" 같은 뻔한 말은 하지 마세요.`;

  return callGemini(prompt);
}

export async function analyzePerformance(
  profile: ProfileRow,
  media: MediaWithInsight[],
): Promise<string> {
  const prompt = `당신은 한국 인스타그램/스레드 시장에 정통한 소셜 미디어 분석가입니다.

${buildProfileContext(profile)}

${buildMediaContext(media)}

이 크리에이터의 콘텐츠 성과를 분석하고 실행 가능한 인사이트를 제공하세요.

중요: "자기소개"를 참고해서 이 크리에이터의 고유한 맥락에 맞는 분석을 하세요. 실제 데이터를 인용하며 근거 있는 분석만 하세요.

다음 구조로 답변하세요:

## 성과 요약
[전체 트렌드, 강점과 약점. 실제 숫자를 인용]

## 패턴 분석
[어떤 포맷/주제/스타일이 가장 좋은 성과를 내는지, 왜 그런지. 구체적 게시글 참조]

## 개선 포인트
[데이터 근거가 있는 구체적 개선 제안. "더 좋은 콘텐츠를 만드세요" 같은 뻔한 말 금지. 실제 게시글의 캡션이나 메트릭을 인용하며 설명]

## 다음 콘텐츠 제안
[잘 되고 있는 패턴 + 크리에이터 목표를 반영한 구체적 콘텐츠 아이디어 3개. 각각 포맷, 주제, Hook 포함]

구체적이고 데이터 기반의 조언만 하세요.`;

  return callGemini(prompt);
}

export async function extractContentPatterns(
  profile: ProfileRow,
  media: MediaWithInsight[],
): Promise<Array<{ pattern_type: string; pattern: string; evidence: string }>> {
  if (media.length === 0) return [];

  const prompt = `You are a social media performance analyst.

${buildProfileContext(profile)}

${buildMediaContext(media)}

Analyze the performance data above and extract actionable content patterns. For each pattern, identify specific evidence from the posts.

Return ONLY a valid JSON array with no markdown formatting. Each object must have:
- "pattern_type": one of "topic", "format", "tone", "timing", "hook", "general"
- "pattern": a concise, actionable insight in English (1-2 sentences)
- "evidence": a brief reference to which posts support this (e.g. "Posts #1, #5 with 8%+ ER")

Rules:
- Extract 5-10 patterns maximum
- Only include patterns supported by actual data — do not speculate
- Focus on what THIS creator should replicate or avoid
- If there are fewer than 3 posts, extract what you can but note limited data

Example output format:
[{"pattern_type":"topic","pattern":"Posts about AI tools get 2x the engagement rate vs general tech posts","evidence":"Posts #2, #7 averaged 6.2% ER vs 3.1% overall"}]`;

  const raw = await callGemini(prompt);

  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();

  try {
    const parsed = JSON.parse(cleaned) as Array<{ pattern_type: string; pattern: string; evidence: string }>;
    const validTypes = new Set(["topic", "format", "tone", "timing", "hook", "general"]);
    return parsed
      .filter((p) => validTypes.has(p.pattern_type) && p.pattern && p.evidence)
      .map((p) => ({
        pattern_type: p.pattern_type,
        pattern: p.pattern,
        evidence: p.evidence,
      }));
  } catch {
    console.error("Failed to parse content patterns JSON:", cleaned.slice(0, 200));
    return [];
  }
}

export async function scoreRelevance(
  profile: ProfileRow,
  items: Array<{ id: string; source_type: string; title: string; raw_data: string }>,
): Promise<Array<{ id: string; score: number; reason: string }>> {
  if (items.length === 0) return [];

  const itemList = items
    .map((item, i) => `${i + 1}. [${item.source_type}] "${item.title}"`)
    .join("\n");

  const prompt = `You are a content relevance analyst for a social media creator.

${buildProfileContext(profile)}

Below are candidate content sources. Score each one on relevance to this creator's niche, audience, and goals.

## Candidates
${itemList}

Return ONLY a valid JSON array. Each object must have:
- "index": the 1-based item number
- "score": 0.0 to 1.0 (0 = irrelevant, 1 = perfect match)
- "reason": one sentence explaining why it is or isn't relevant

Rules:
- Score > 0.6 = relevant (creator should consider making content about this)
- Score 0.3-0.6 = maybe relevant (tangential to their niche)
- Score < 0.3 = not relevant (skip)
- Consider: Does their target audience care? Can the creator add unique perspective? Is it timely?

Example: [{"index":1,"score":0.85,"reason":"Directly relates to AI tools which matches the creator's tech niche"}]`;

  const raw = await callGemini(prompt);
  const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();

  try {
    const parsed = JSON.parse(cleaned) as Array<{ index: number; score: number; reason: string }>;
    return parsed
      .filter((p) => typeof p.index === "number" && typeof p.score === "number")
      .map((p) => ({
        id: items[p.index - 1]?.id ?? "",
        score: Math.max(0, Math.min(1, p.score)),
        reason: p.reason || "",
      }))
      .filter((p) => p.id !== "");
  } catch {
    console.error("Failed to parse relevance scores:", cleaned.slice(0, 200));
    return [];
  }
}

export async function generateDraftFromSource(
  profile: ProfileRow,
  source: { source_type: string; title: string; raw_data: string },
  options?: {
    patterns?: ContentPatternRow[];
    topPosts?: MediaWithInsight[];
  },
): Promise<{ title: string; content: string; platform: string; format: string }> {
  const performanceCtx = options
    ? buildPerformanceContext(options.patterns || [], options.topPosts || [])
    : "";

  const prompt = `You are a social media content writer for a creator.

${buildProfileContext(profile)}
${performanceCtx ? "\n" + performanceCtx + "\n" : ""}
## Source Material
Type: ${source.source_type}
Title: ${source.title}
Data: ${source.raw_data}

Write a single Threads post (the best platform for quick-turnaround content) based on this source.

Requirements:
- 500 characters or less
- Conversational tone, not robotic
- Add the creator's unique perspective or take — don't just summarize
- 2-3 relevant hashtags
- Written in Korean
- Must be ready to post as-is

Return ONLY valid JSON with these fields:
- "title": short label for this draft (English, max 50 chars)
- "content": the full post text (Korean)

Example: {"title":"OpenAI GPT-5 reaction","content":"GPT-5 발표 봤는데..."}`;

  const raw = await callGemini(prompt);
  const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();

  try {
    const parsed = JSON.parse(cleaned) as { title: string; content: string };
    return {
      title: parsed.title || source.title.slice(0, 50),
      content: parsed.content || "",
      platform: "threads",
      format: "thread",
    };
  } catch {
    throw new Error("Failed to parse generated draft");
  }
}

function buildPerformanceContext(
  patterns: ContentPatternRow[],
  topPosts: MediaWithInsight[],
): string {
  if (patterns.length === 0 && topPosts.length === 0) return "";

  const sections: string[] = [];
  sections.push("## Performance Insights (from past content)");

  // Group patterns by type
  if (patterns.length > 0) {
    sections.push("**Learned patterns — apply these as guidelines, not rigid rules:**");
    for (const p of patterns) {
      sections.push(`- [${p.pattern_type}] ${p.pattern}`);
    }
  }

  // Top performing posts as style reference
  if (topPosts.length > 0) {
    sections.push("");
    sections.push("**Top performing posts — match this tone and structure:**");
    for (const m of topPosts) {
      const er = engagementRate(m).toFixed(1);
      const caption = (m.caption || "").slice(0, 200);
      sections.push(`- [${m.media_type}] ER: ${er}% | Reach: ${m.reach ?? 0} | "${caption}"`);
    }
  }

  sections.push("");
  sections.push("IMPORTANT: Use these insights to guide tone, structure, and angle. Do NOT copy past captions. The new content must be about the provided source material.");

  return sections.join("\n");
}

export async function generateDrafts(
  profile: ProfileRow,
  sourceType: "news" | "github",
  sourceContent: string,
  options?: {
    patterns?: ContentPatternRow[];
    topPosts?: MediaWithInsight[];
  },
): Promise<string> {
  const performanceCtx = options
    ? buildPerformanceContext(options.patterns || [], options.topPosts || [])
    : "";

  const prompt = `당신은 소셜 미디어 콘텐츠 전문 작가입니다.

${buildProfileContext(profile)}
${performanceCtx ? "\n" + performanceCtx + "\n" : ""}
## 소스 (${sourceType === "news" ? "Tech News" : "GitHub Activity"})
${sourceContent}

이 소스를 기반으로 3가지 소셜 미디어 포스트 초안을 작성하세요.

**반드시 아래 형식을 지켜주세요:**

## Draft 1: Instagram Carousel
- **Hook (첫 슬라이드):** [스크롤을 멈추게 하는 강렬한 한 줄]
- **Slide 2:** [핵심 정보 1]
- **Slide 3:** [핵심 정보 2]
- **Slide 4:** [핵심 정보 3]
- **Slide 5 (CTA):** [행동 유도]
- **Caption:** [해시태그 포함 캡션]

## Draft 2: Instagram Reel Script
- **Hook (0-3초):** [시선을 잡는 첫 마디]
- **Body (3-30초):** [핵심 내용, 대화체]
- **CTA (마지막):** [팔로우/저장 유도]
- **Caption:** [해시태그 포함]

## Draft 3: Threads Post
[500자 이내. 대화체. 정보 + 내 관점. 해시태그 2-3개]

규칙:
1. 크리에이터의 스타일과 톤에 맞게 작성
2. 타겟 오디언스가 관심 가질 만한 각도로 접근
3. 한국어로 작성
4. 뻔한 내용 대신 독특한 관점 제시
${performanceCtx ? "5. Performance Insights 섹션의 패턴을 반영해서 톤, 구조, 접근 각도를 조정하세요" : ""}`;

  return callGemini(prompt);
}
