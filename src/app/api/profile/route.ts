import { NextResponse } from "next/server";
import { getProfile, upsertProfile } from "@/lib/db";

export async function GET() {
  try {
    const profile = getProfile();
    return NextResponse.json({ profile: profile ?? null });
  } catch (err) {
    console.error("Failed to get profile:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const profile = upsertProfile({
      category: body.category ?? "",
      target_audience: body.target_audience ?? "",
      content_goal: body.content_goal ?? "growth",
      primary_format: body.primary_format ?? "mixed",
      posting_frequency: body.posting_frequency ?? "3_per_week",
      competitors: body.competitors ?? "[]",
      bio: body.bio ?? "",
    });
    return NextResponse.json({ profile });
  } catch (err) {
    console.error("Failed to save profile:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
