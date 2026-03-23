import { NextResponse } from "next/server";
import { refreshTokensIfNeeded } from "@/lib/token-refresh";

export async function POST() {
  try {
    const result = await refreshTokensIfNeeded();
    return NextResponse.json({ refreshed: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
