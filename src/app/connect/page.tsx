"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ConnectionStatus {
  platform: string;
  connected: boolean;
  username?: string;
  expires_at?: string;
}

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
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Connect Platforms</h1>
        <p className="text-muted-foreground">
          Connect your social media accounts to start tracking performance.
        </p>
      </div>

      {successPlatform && (
        <Alert>
          <AlertDescription>
            {successPlatform} connected successfully!
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Instagram */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Instagram</CardTitle>
            {connections.find((c) => c.platform === "instagram")?.connected ? (
              <Badge variant="default">Connected</Badge>
            ) : (
              <Badge variant="secondary">Not connected</Badge>
            )}
          </CardHeader>
          <CardContent>
            {(() => {
              const ig = connections.find((c) => c.platform === "instagram");
              if (ig?.connected) {
                const days = daysUntilExpiry(ig.expires_at!);
                return (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">@{ig.username}</p>
                    <p className="text-xs text-muted-foreground">
                      Token expires in {days} days
                    </p>
                    {days < 14 && (
                      <Alert variant="destructive">
                        <AlertDescription>
                          Token expiring soon. Reconnect to refresh.
                        </AlertDescription>
                      </Alert>
                    )}
                    <a href="/api/auth/instagram">
                      <Button variant="outline" size="sm">Reconnect</Button>
                    </a>
                  </div>
                );
              }
              return (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Business or Creator account required.
                  </p>
                  <a href="/api/auth/instagram">
                    <Button>Connect Instagram</Button>
                  </a>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Threads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Threads</CardTitle>
            <Badge variant="secondary">Coming soon</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Threads integration will be available soon.
            </p>
            <Button variant="outline" size="sm" className="mt-3" disabled>
              Connect Threads
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
