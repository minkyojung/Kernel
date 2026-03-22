import { Router, Request, Response } from "express";
import { upsertToken } from "../db/schema";

const router = Router();

const APP_ID = process.env.INSTAGRAM_APP_ID!;
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET!;
const REDIRECT_URI = process.env.REDIRECT_URI!;

const SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_insights",
  "instagram_business_content_publish",
  "instagram_business_manage_comments",
].join(",");

// Step 1: Redirect user to Instagram authorization page
router.get("/auth/instagram", (_req: Request, res: Response) => {
  const authUrl = new URL("https://www.instagram.com/oauth/authorize");
  authUrl.searchParams.set("client_id", APP_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES);

  res.redirect(authUrl.toString());
});

// Step 2: Handle callback — exchange code for tokens
router.get("/auth/instagram/callback", async (req: Request, res: Response) => {
  const { code, error, error_description } = req.query;

  if (error) {
    res.status(400).json({
      error: String(error),
      description: String(error_description || "Authorization denied"),
    });
    return;
  }

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Missing authorization code" });
    return;
  }

  try {
    // Exchange code for short-lived token
    const shortTokenRes = await fetch(
      "https://api.instagram.com/oauth/access_token",
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
      res.status(400).json({ error: "Short-lived token exchange failed", details: err });
      return;
    }

    const shortToken = (await shortTokenRes.json()) as {
      access_token: string;
      user_id: number;
    };

    // Exchange short-lived for long-lived token (60 days)
    const longTokenUrl = new URL("https://graph.instagram.com/access_token");
    longTokenUrl.searchParams.set("grant_type", "ig_exchange_token");
    longTokenUrl.searchParams.set("client_secret", APP_SECRET);
    longTokenUrl.searchParams.set("access_token", shortToken.access_token);

    const longTokenRes = await fetch(longTokenUrl.toString());

    if (!longTokenRes.ok) {
      const err = await longTokenRes.json();
      res.status(400).json({ error: "Long-lived token exchange failed", details: err });
      return;
    }

    const longToken = (await longTokenRes.json()) as {
      access_token: string;
      token_type: string;
      expires_in: number;
    };

    // Fetch user profile
    const profileUrl = new URL("https://graph.instagram.com/me");
    profileUrl.searchParams.set("fields", "id,username,account_type");
    profileUrl.searchParams.set("access_token", longToken.access_token);

    const profileRes = await fetch(profileUrl.toString());
    const profile = (await profileRes.json()) as {
      id: string;
      username: string;
      account_type: string;
    };

    // Save to DB
    const expiresAt = new Date(Date.now() + longToken.expires_in * 1000);
    const saved = upsertToken(
      "instagram",
      profile.id,
      profile.username,
      longToken.access_token,
      expiresAt,
    );

    res.json({
      message: "Instagram connected successfully",
      username: profile.username,
      account_type: profile.account_type,
      expires_at: saved.expires_at,
    });
  } catch (err) {
    console.error("Instagram OAuth error:", err);
    res.status(500).json({ error: "Internal server error during OAuth flow" });
  }
});

export default router;
