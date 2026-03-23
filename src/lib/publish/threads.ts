import { getToken } from "../db";

const API_BASE = "https://graph.threads.net/v1.0";

interface ContainerResponse {
  id: string;
}

interface PublishResponse {
  id: string;
}

/**
 * Publish a text post to Threads using the Container Model:
 * 1. Create container (upload content)
 * 2. Publish container (make it live)
 */
export async function publishToThreads(text: string): Promise<{ postId: string; error?: string }> {
  const token = getToken("threads");
  if (!token) throw new Error("Threads not connected");

  const userId = token.platform_user_id;
  const accessToken = token.access_token;

  // Step 1: Create container
  const containerRes = await fetch(`${API_BASE}/${userId}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "TEXT",
      text,
      access_token: accessToken,
    }),
  });

  if (!containerRes.ok) {
    const err = await containerRes.json();
    throw new Error(`Container creation failed: ${JSON.stringify(err)}`);
  }

  const container = (await containerRes.json()) as ContainerResponse;

  // Wait for container to be ready (Threads needs a brief moment)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Step 2: Publish container
  const publishRes = await fetch(`${API_BASE}/${userId}/threads_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: container.id,
      access_token: accessToken,
    }),
  });

  if (!publishRes.ok) {
    const err = await publishRes.json();
    throw new Error(`Publish failed: ${JSON.stringify(err)}`);
  }

  const published = (await publishRes.json()) as PublishResponse;
  return { postId: published.id };
}
