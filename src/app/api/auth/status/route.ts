import { NextResponse } from "next/server";
import { getToken } from "@/lib/db";

export async function GET() {
  const instagram = getToken("instagram");
  const threads = getToken("threads");

  const connections = [
    {
      platform: "instagram",
      connected: !!instagram,
      username: instagram?.username,
      expires_at: instagram?.expires_at,
    },
    {
      platform: "threads",
      connected: !!threads,
      username: threads?.username,
      expires_at: threads?.expires_at,
    },
  ];

  return NextResponse.json({ connections });
}
