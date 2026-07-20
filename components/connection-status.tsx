"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Power, Smartphone } from "lucide-react";

import { connectionDisplayNumber } from "@/lib/connection-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ConnectionStatusProps {
  onConnectClick: () => void;
  refreshTrigger?: number;
}

interface ConnectionData {
  connected: boolean;
  status: string;
  owner?: string;
}

export function ConnectionStatus({
  onConnectClick,
  refreshTrigger,
}: ConnectionStatusProps) {
  const [connection, setConnection] = useState<ConnectionData>({
    connected: false,
    status: "checking",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/evolution/status", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Status check failed");
      }
      setConnection({
        connected: Boolean(data.connected),
        status: data.status || "disconnected",
        owner: data.owner,
      });
      setError(null);
    } catch {
      setConnection({ connected: false, status: "error" });
      setError("Connection status unavailable");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkStatus();
    const interval = window.setInterval(() => void checkStatus(), 5_000);
    return () => window.clearInterval(interval);
  }, [checkStatus]);

  useEffect(() => {
    if (refreshTrigger) void checkStatus();
  }, [checkStatus, refreshTrigger]);

  async function handleDisconnect() {
    if (!window.confirm("Disconnect WhatsApp and delete this Connection from the server?")) {
      return;
    }

    setIsDisconnecting(true);
    setError(null);
    try {
      const response = await fetch("/api/evolution/disconnect", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Disconnect failed");
      }
      setConnection({ connected: false, status: "not_found" });
    } catch {
      setError("Could not disconnect. Please try again.");
    } finally {
      setIsDisconnecting(false);
    }
  }

  if (isLoading) {
    return (
      <Badge variant="outline" className="h-9 gap-2 px-3">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Checking WhatsApp
      </Badge>
    );
  }

  if (!connection.connected) {
    const isWaiting =
      connection.status !== "not_found" &&
      connection.status !== "disconnected" &&
      connection.status !== "error";

    return (
      <div className="flex items-center gap-2">
        {isWaiting && (
          <Badge
            variant="outline"
            className="hidden h-9 gap-2 border-amber-300 bg-amber-50 px-3 text-amber-800 sm:flex"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            Waiting for QR scan
          </Badge>
        )}
        <Button onClick={onConnectClick} className="bg-green-600 hover:bg-green-700">
          <Smartphone className="h-4 w-4" />
          {isWaiting ? "Show QR" : "Connect WhatsApp"}
        </Button>
        {error && <span className="sr-only">{error}</span>}
      </div>
    );
  }

  const number = connectionDisplayNumber(connection.owner);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-1 pl-3">
      <div className="hidden min-w-0 sm:block">
        <p className="text-xs font-medium text-green-700">Connected as</p>
        <p className="truncate text-sm font-semibold text-gray-900">
          {number || "WhatsApp account"}
        </p>
      </div>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDisconnect}
        disabled={isDisconnecting}
        aria-label="Disconnect WhatsApp and delete Connection"
      >
        {isDisconnecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Power className="h-4 w-4" />
        )}
        <span className="hidden md:inline">
          {isDisconnecting ? "Disconnecting" : "Disconnect"}
        </span>
      </Button>
      {error && <span className="sr-only">{error}</span>}
    </div>
  );
}
