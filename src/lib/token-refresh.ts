import { getToken, upsertToken, type TokenRow } from "./db";

const REFRESH_THRESHOLD_DAYS = 30;

async function refreshInstagramToken(token: TokenRow): Promise<boolean> {
  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", token.access_token);

  const res = await fetch(url.toString());
  if (!res.ok) {
    console.error(`[token-refresh] Instagram refresh failed: ${res.status}`);
    return false;
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  upsertToken("instagram", token.platform_user_id, token.username, data.access_token, expiresAt);
  console.log(`[token-refresh] Instagram token refreshed, expires: ${expiresAt.toISOString()}`);
  return true;
}

async function refreshThreadsToken(token: TokenRow): Promise<boolean> {
  const url = new URL("https://graph.threads.net/refresh_access_token");
  url.searchParams.set("grant_type", "th_refresh_token");
  url.searchParams.set("access_token", token.access_token);

  const res = await fetch(url.toString());
  if (!res.ok) {
    console.error(`[token-refresh] Threads refresh failed: ${res.status}`);
    return false;
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  upsertToken("threads", token.platform_user_id, token.username, data.access_token, expiresAt);
  console.log(`[token-refresh] Threads token refreshed, expires: ${expiresAt.toISOString()}`);
  return true;
}

function needsRefresh(token: TokenRow): boolean {
  const expiresAt = new Date(token.expires_at);
  const daysUntilExpiry = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return daysUntilExpiry < REFRESH_THRESHOLD_DAYS;
}

export async function refreshTokensIfNeeded(): Promise<{ instagram: boolean; threads: boolean }> {
  const result = { instagram: false, threads: false };

  const igToken = getToken("instagram");
  if (igToken && needsRefresh(igToken)) {
    result.instagram = await refreshInstagramToken(igToken);
  }

  const thToken = getToken("threads");
  if (thToken && needsRefresh(thToken)) {
    result.threads = await refreshThreadsToken(thToken);
  }

  return result;
}
