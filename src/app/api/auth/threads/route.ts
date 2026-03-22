import { NextResponse } from "next/server";

const APP_ID = process.env.THREADS_APP_ID!;
const REDIRECT_URI = process.env.THREADS_REDIRECT_URI!;

const SCOPES = [
  "threads_basic",
  "threads_content_publish",
  "threads_manage_insights",
  "threads_read_replies",
  "threads_manage_replies",
].join(",");

export async function GET() {
  const authUrl = new URL("https://threads.net/oauth/authorize");
  authUrl.searchParams.set("client_id", APP_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES);

  return NextResponse.redirect(authUrl.toString());
}
