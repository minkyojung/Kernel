import { NextResponse } from "next/server";
import { syncAllInsights } from "@/lib/instagram";
import { getAllMediaWithInsights } from "@/lib/db";
import { refreshTokensIfNeeded } from "@/lib/token-refresh";

// GET: return all media with insights from DB
export async function GET() {
  try {
    const media = getAllMediaWithInsights();
    return NextResponse.json({ data: media });
  } catch (err) {
    console.error("Failed to get insights:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// POST: sync media & insights from Instagram API, then return results
export async function POST() {
  try {
    // Auto-refresh tokens if expiring within 30 days
    await refreshTokensIfNeeded();

    const count = await syncAllInsights();
    const media = getAllMediaWithInsights();
    return NextResponse.json({
      message: `Synced ${count} media with insights`,
      data: media,
    });
  } catch (err) {
    console.error("Failed to sync insights:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
