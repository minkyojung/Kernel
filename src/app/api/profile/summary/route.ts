import { NextResponse } from "next/server";
import { getProfile } from "@/lib/db";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export async function POST() {
  try {
    const profile = getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 400 });
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });
    }

    const competitors = JSON.parse(profile.competitors || "[]") as string[];

    const goalMap: Record<string, string> = {
      awareness: "브랜드 인지도 확대",
      growth: "팔로워 성장",
      conversion: "전환/매출 유도",
      community: "커뮤니티 구축",
    };

    const formatMap: Record<string, string> = {
      reel: "릴스",
      carousel: "캐러셀",
      image: "이미지",
      mixed: "혼합",
    };

    const freqMap: Record<string, string> = {
      daily: "매일",
      "5_per_week": "주 5회",
      "3_per_week": "주 3회",
      "2_per_week": "주 2회",
      weekly: "주 1회",
    };

    const prompt = `당신은 소셜 미디어 전문가입니다. 아래 크리에이터 프로필을 읽고, 이 크리에이터를 어떻게 이해했는지 간결하게 확인해주세요.

## 크리에이터 프로필
- 자기소개: ${profile.bio}
- 카테고리: ${profile.category}
- 콘텐츠 목표: ${goalMap[profile.content_goal] || profile.content_goal}
- 타겟 오디언스: ${profile.target_audience || "미지정"}
- 주력 포맷: ${formatMap[profile.primary_format] || profile.primary_format}
- 포스팅 빈도: ${freqMap[profile.posting_frequency] || profile.posting_frequency}
- 레퍼런스 계정: ${competitors.length > 0 ? competitors.map((c) => "@" + c).join(", ") : "없음"}

다음 형식으로 답변하세요 (한국어, 간결하게):

## 프로필 요약
[이 크리에이터가 누구이고, 어떤 콘텐츠를 만드는지 2-3문장으로 요약]

## 핵심 포인트
- [이 니치에서 주목할 점 1]
- [이 니치에서 주목할 점 2]
- [설정한 목표를 달성하기 위한 핵심 방향 1]

## 추천 KPI 기준
- 참여율 목표: [이 카테고리의 현실적 목표]
- 저장률 목표: [이 카테고리의 현실적 목표]
- 도달 목표: [초기/중기 현실적 기대치]

3-4문단 이내로 간결하게 작성하세요.`;

    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 4096 },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Gemini error: ${err}` }, { status: 500 });
    }

    interface GeminiResponse {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    }

    const data = (await res.json()) as GeminiResponse;
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return NextResponse.json({ summary });
  } catch (err) {
    console.error("Profile summary error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
