import { NextResponse } from "next/server";
import { fetchTodayActivity } from "@/lib/sources/github";

export async function GET() {
  try {
    const activity = await fetchTodayActivity();
    return NextResponse.json(activity);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
