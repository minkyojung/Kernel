import { NextResponse } from "next/server";
import { fetchTopTechNews } from "@/lib/sources/news";

export async function GET() {
  try {
    const news = await fetchTopTechNews(15);
    return NextResponse.json(news);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
