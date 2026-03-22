"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ConnectionStatus {
  platform: string;
  connected: boolean;
  username?: string;
  expires_at?: string;
}

const PLATFORMS = [
  { id: "instagram", label: "Instagram", authUrl: "/api/auth/instagram", available: true },
  { id: "threads", label: "Threads", authUrl: "/api/auth/threads", available: true },
  { id: "youtube", label: "YouTube", authUrl: "#", available: false },
  { id: "tiktok", label: "TikTok", authUrl: "#", available: false },
];

export default function ConnectPage() {
  const [connections, setConnections] = useState<ConnectionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [successPlatform, setSuccessPlatform] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    if (success) {
      setSuccessPlatform(success);
      window.history.replaceState({}, "", "/connect");
    }

    fetch("/api/auth/status")
      .then((res) => res.json())
      .then((data) => setConnections(data.connections))
      .catch(() => setConnections([]))
      .finally(() => setLoading(false));
  }, []);

  const daysUntilExpiry = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-sm text-muted-foreground">Manage your social media connections.</p>

      {successPlatform && (
        <Alert>
          <AlertDescription>{successPlatform} connected successfully!</AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border divide-y divide-border">
        {PLATFORMS.map((platform) => {
          const conn = connections.find((c) => c.platform === platform.id);
          const isConnected = conn?.connected;
          const days = isConnected && conn?.expires_at ? daysUntilExpiry(conn.expires_at) : null;

          return (
            <div key={platform.id} className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500" : platform.available ? "bg-muted-foreground/30" : "bg-muted-foreground/10"}`} />
                <div>
                  <p className="text-sm font-medium">{platform.label}</p>
                  {isConnected && (
                    <p className="text-xs text-muted-foreground">
                      @{conn?.username} {days != null && `· ${days}d until refresh`}
                    </p>
                  )}
                  {!isConnected && !platform.available && (
                    <p className="text-xs text-muted-foreground">Coming soon</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isConnected ? (
                  <>
                    <Badge variant="secondary" className="text-xs">Connected</Badge>
                    <a href={platform.authUrl}>
                      <Button variant="ghost" size="sm" className="text-xs h-7">Reconnect</Button>
                    </a>
                  </>
                ) : platform.available ? (
                  <a href={platform.authUrl}>
                    <Button variant="outline" size="sm" className="text-xs h-7">Connect</Button>
                  </a>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
