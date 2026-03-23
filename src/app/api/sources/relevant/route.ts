import { NextResponse } from "next/server";
import { getRelevantSources } from "@/lib/db";

export async function GET() {
  try {
    const sources = getRelevantSources(20);
    return NextResponse.json({ sources });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
