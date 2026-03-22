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
