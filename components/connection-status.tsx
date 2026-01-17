"use client";

import { useState, useEffect, useRef } from "react";
import { SaveButton } from "@/components/ui/save-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Power } from "lucide-react";

interface ConnectionStatusProps {
  onConnectClick: () => void;
  refreshTrigger?: number; // Increment this to trigger a refresh
  cancelTrigger?: number; // Increment this to cancel connection attempt
}

interface ConnectionData {
  connected: boolean;
  status: string;
  profileName?: string;
  profilePictureUrl?: string;
  instanceName?: string;
  owner?: string;
}

export function ConnectionStatus({ onConnectClick, refreshTrigger, cancelTrigger }: ConnectionStatusProps) {
  const [connectionData, setConnectionData] = useState<ConnectionData>({
    connected: false,
    status: "checking",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);
  const connectionPromiseResolve = useRef<(() => void) | null>(null);
  const connectionPromiseReject = useRef<((reason?: Error) => void) | null>(null);

  // Fetch connection status
  const checkStatus = async () => {
    console.log("[ConnectionStatus] Checking status...");
    try {
      const response = await fetch("/api/evolution/status");
      const data = await response.json();
      console.log("[ConnectionStatus] API Response:", data);

      if (!isMounted.current) return;

      if (data.success) {
        console.log("[ConnectionStatus] Setting connected:", data.connected);
        setConnectionData({
          connected: data.connected || false,
          status: data.status || "unknown",
          profileName: data.profileName,
          profilePictureUrl: data.profilePictureUrl,
          instanceName: data.instanceName,
          owner: data.owner,
        });

        // If we just connected and there's a pending connection promise, resolve it
        if (data.connected && connectionPromiseResolve.current) {
          connectionPromiseResolve.current();
          connectionPromiseResolve.current = null;
        }
      } else {
        console.log("[ConnectionStatus] API returned success: false", data.error);
        setConnectionData({
          connected: false,
          status: "error",
        });
      }
    } catch (error) {
      console.error("[ConnectionStatus] Error checking connection status:", error);
      if (isMounted.current) {
        setConnectionData({
          connected: false,
          status: "error",
        });
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  // Start polling status
  const startPolling = () => {
    checkStatus(); // Check immediately
    pollingInterval.current = setInterval(checkStatus, 10000); // Poll every 10 seconds
  };

  // Stop polling
  const stopPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };

  // Start polling on mount
  useEffect(() => {
    isMounted.current = true;
    startPolling();
    return () => {
      isMounted.current = false;
      stopPolling();
      // Cleanup pending connection promises to prevent memory leaks
      if (connectionPromiseReject.current) {
        connectionPromiseReject.current(new Error("Component unmounted"));
        connectionPromiseReject.current = null;
        connectionPromiseResolve.current = null;
      }
    };
    // startPolling is intentionally only called on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh when trigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      checkStatus();
    }
  }, [refreshTrigger]);

  // Cancel connection attempt when modal is closed
  useEffect(() => {
    if (cancelTrigger !== undefined && cancelTrigger > 0) {
      console.log("[ConnectionStatus] Cancel triggered");
      if (connectionPromiseReject.current) {
        connectionPromiseReject.current(new Error("Connection cancelled by user"));
        connectionPromiseReject.current = null;
        connectionPromiseResolve.current = null;
      }
    }
  }, [cancelTrigger]);

  // Handle disconnect
  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your WhatsApp account?")) {
      return;
    }

    console.log("[ConnectionStatus] Starting disconnect...");
    setIsDisconnecting(true);
    try {
      const response = await fetch("/api/evolution/disconnect", {
        method: "POST",
      });

      console.log("[ConnectionStatus] Disconnect response status:", response.status);
      const data = await response.json();
      console.log("[ConnectionStatus] Disconnect response data:", data);

      if (data.success) {
        console.log("[ConnectionStatus] Disconnect successful, updating state...");
        setConnectionData({
          connected: false,
          status: "disconnected",
        });
        // Refresh status after disconnect
        console.log("[ConnectionStatus] Scheduling status check in 2 seconds...");
        setTimeout(checkStatus, 2000);
      } else {
        console.error("[ConnectionStatus] Disconnect failed:", data.error);
        alert("Failed to disconnect. Please try again.");
      }
    } catch (error) {
      console.error("[ConnectionStatus] Error disconnecting:", error);
      alert("Error disconnecting. Please try again.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
        <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
        <span className="text-sm text-gray-600">Checking connection...</span>
      </div>
    );
  }

  // Handle connect button click - returns a Promise that resolves when connected
  const handleConnectClick = async () => {
    // Open the modal
    onConnectClick();

    // Return a Promise that resolves when connection is established, or rejects if cancelled
    return new Promise<void>((resolve, reject) => {
      connectionPromiseResolve.current = resolve;
      connectionPromiseReject.current = reject;
    });
  };

  // Disconnected state - Show prominent connect button
  if (!connectionData.connected) {
    return (
        <SaveButton
          text={{
            idle: "Conectar Whatsapp",
            saving: "Conectando...",
            saved: "Conectado!"
          }}
          onSave={handleConnectClick}
          enableConfetti={false}
          className="px-6"
        />
    );
  }

  // Connected state - Show profile with dropdown menu
  const profileName = connectionData.profileName || "User";
  const initials = profileName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Extract phone number from owner (format: 55XXXXXXXXXXX@s.whatsapp.net)
  // Remove country code (55 for Brazil) and format nicely
  const getPhoneNumber = () => {
    if (!connectionData.owner) return null;
    const numberPart = connectionData.owner.split("@")[0];
    // Remove Brazil country code (55) if present
    if (numberPart.startsWith("55") && numberPart.length > 10) {
      return numberPart.slice(2);
    }
    return numberPart;
  };

  const phoneNumber = getPhoneNumber();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 px-3 py-2 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200">
          <Avatar className="h-10 w-10">
            <AvatarImage src={connectionData.profilePictureUrl} alt={profileName} />
            <AvatarFallback className="bg-green-600 text-white text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-gray-900">{profileName}</span>
              {phoneNumber && (
                <span className="text-sm text-gray-500">({phoneNumber})</span>
              )}
            </div>
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs px-2 py-0">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>
              Connected
            </Badge>
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={handleDisconnect}
          disabled={isDisconnecting}
          className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
        >
          <Power className="h-4 w-4 mr-2" />
          {isDisconnecting ? "Disconnecting..." : "Disconnect"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
