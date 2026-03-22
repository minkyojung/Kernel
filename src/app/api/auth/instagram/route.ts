import { NextResponse } from "next/server";

const APP_ID = process.env.INSTAGRAM_APP_ID!;
const REDIRECT_URI = process.env.REDIRECT_URI!;

const SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_insights",
  "instagram_business_content_publish",
  "instagram_business_manage_comments",
].join(",");

export async function GET() {
  const authUrl = new URL("https://www.instagram.com/oauth/authorize");
  authUrl.searchParams.set("client_id", APP_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES);

  return NextResponse.redirect(authUrl.toString());
}
