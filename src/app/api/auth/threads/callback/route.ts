import { NextRequest, NextResponse } from "next/server";
import { upsertToken } from "@/lib/db";

const APP_ID = process.env.THREADS_APP_ID!;
const APP_SECRET = process.env.THREADS_APP_SECRET!;
const REDIRECT_URI = process.env.THREADS_REDIRECT_URI!;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.json(
      { error, description: searchParams.get("error_description") || "Authorization denied" },
      { status: 400 },
    );
  }

  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
  }

  try {
    // Exchange code for short-lived token
    const shortTokenRes = await fetch(
      "https://graph.threads.net/oauth/access_token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: APP_ID,
          client_secret: APP_SECRET,
          grant_type: "authorization_code",
          redirect_uri: REDIRECT_URI,
          code,
        }),
      },
    );

    if (!shortTokenRes.ok) {
      const err = await shortTokenRes.json();
      return NextResponse.json(
        { error: "Short-lived token exchange failed", details: err },
        { status: 400 },
      );
    }

    const shortToken = (await shortTokenRes.json()) as {
      access_token: string;
      user_id: number;
    };

    // Exchange for long-lived token (60 days)
    const longTokenUrl = new URL("https://graph.threads.net/access_token");
    longTokenUrl.searchParams.set("grant_type", "th_exchange_token");
    longTokenUrl.searchParams.set("client_secret", APP_SECRET);
    longTokenUrl.searchParams.set("access_token", shortToken.access_token);

    const longTokenRes = await fetch(longTokenUrl.toString());
    if (!longTokenRes.ok) {
      const err = await longTokenRes.json();
      return NextResponse.json(
        { error: "Long-lived token exchange failed", details: err },
        { status: 400 },
      );
    }

    const longToken = (await longTokenRes.json()) as {
      access_token: string;
      token_type: string;
      expires_in: number;
    };

    // Fetch user profile
    const profileUrl = new URL("https://graph.threads.net/me");
    profileUrl.searchParams.set("fields", "id,username,threads_profile_picture_url");
    profileUrl.searchParams.set("access_token", longToken.access_token);

    const profileRes = await fetch(profileUrl.toString());
    const profile = (await profileRes.json()) as {
      id: string;
      username: string;
    };

    // Save to DB
    const expiresAt = new Date(Date.now() + longToken.expires_in * 1000);
    upsertToken("threads", profile.id, profile.username, longToken.access_token, expiresAt);

    // Redirect to connect page with success
    const redirectUrl = new URL("/connect", req.url);
    redirectUrl.searchParams.set("success", "threads");
    return NextResponse.redirect(redirectUrl.toString());
  } catch (err) {
    console.error("Threads OAuth error:", err);
    return NextResponse.json(
      { error: "Internal server error during OAuth flow" },
      { status: 500 },
    );
  }
}
