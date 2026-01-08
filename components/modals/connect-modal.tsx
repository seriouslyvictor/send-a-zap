"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected?: () => void;
}

export function ConnectModal({ open, onOpenChange, onConnected }: ConnectModalProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Loading...");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const pollingAttempts = useRef<number>(0);
  const isMounted = useRef<boolean>(true);
  const MAX_POLLING_ATTEMPTS = 40; // 40 attempts * 3 seconds = 2 minutes timeout

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      isMounted.current = true;
      pollingAttempts.current = 0;
      setQrCode(null);
      setIsConnected(false);
      setErrorMessage(null);
      setStatus("Loading...");
      fetchQRCode();
      startPollingStatus();
    } else {
      // Modal closed - cleanup without deleting instance
      stopPolling();
    }

    return () => {
      isMounted.current = false;
      stopPolling();
    };
  }, [open]);

  const fetchQRCode = async () => {
    if (!isMounted.current) return;

    setIsLoading(true);
    setStatus("Generating QR code...");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/evolution/connect", {
        method: "POST",
      });

      const data = await response.json();

      // Check if component is still mounted
      if (!isMounted.current) return;

      // Handle already connected case
      if (data.success && data.alreadyConnected) {
        setIsConnected(true);
        setStatus("Already connected!");
        onConnected?.();
        setTimeout(() => {
          if (isMounted.current) {
            onOpenChange(false);
          }
        }, 1500);
        return;
      }

      if (data.success && data.qrCode) {
        // QR code is already a data URL from the API
        setQrCode(data.qrCode);
        setStatus("Scan QR code with WhatsApp");
      } else if (data.success && !data.qrCode) {
        setStatus("Waiting for QR code...");
        setErrorMessage("QR code not available yet. Try refreshing.");
      } else {
        setStatus("Failed to generate QR code");
        setErrorMessage(data.error || "Unknown error");
        console.error("QR code error:", data.error);
      }
    } catch (error) {
      console.error("Error fetching QR code:", error);
      if (isMounted.current) {
        setStatus("Error connecting to server");
        setErrorMessage(error instanceof Error ? error.message : "Connection failed");
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const checkConnectionStatus = async () => {
    if (!isMounted.current) return;

    try {
      pollingAttempts.current += 1;

      // Check if timeout reached
      if (pollingAttempts.current >= MAX_POLLING_ATTEMPTS) {
        stopPolling();
        if (isMounted.current) {
          setStatus("QR code expired");
          setErrorMessage("Connection timeout. Please refresh the QR code.");
        }
        return;
      }

      const response = await fetch("/api/evolution/status");
      const data = await response.json();

      if (!isMounted.current) return;

      if (data.success && data.connected) {
        setIsConnected(true);
        setStatus(`Connected as ${data.profileName || "User"}`);
        stopPolling();

        // Call onConnected callback
        onConnected?.();

        // Auto-close modal after 2 seconds
        setTimeout(() => {
          if (isMounted.current) {
            onOpenChange(false);
          }
        }, 2000);
      }
    } catch (error) {
      console.error("Error checking status:", error);
    }
  };

  const startPollingStatus = useCallback(() => {
    // Check immediately after a short delay (give QR code time to load)
    setTimeout(() => {
      if (isMounted.current) {
        checkConnectionStatus();
      }
    }, 1000);

    // Then poll every 3 seconds
    pollingInterval.current = setInterval(() => {
      if (isMounted.current) {
        checkConnectionStatus();
      }
    }, 3000);
  }, []);

  const stopPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };

  const handleRefreshQR = async () => {
    pollingAttempts.current = 0;
    setIsConnected(false);
    setQrCode(null);
    setErrorMessage(null);
    stopPolling();
    await fetchQRCode();
    startPollingStatus();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Connect WhatsApp</DialogTitle>
          <DialogDescription>
            Scan the QR code below with your WhatsApp mobile app to connect your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status */}
          <div className="text-center">
            <p className={`text-sm font-medium ${isConnected ? "text-green-600" : errorMessage ? "text-red-600" : "text-gray-700"}`}>
              {status}
            </p>
            {errorMessage && (
              <p className="text-xs text-red-500 mt-1">{errorMessage}</p>
            )}
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
              {isLoading ? (
                <div className="w-75 h-75 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                </div>
              ) : isConnected ? (
                <div className="w-75 h-75 flex items-center justify-center bg-green-50">
                  <div className="text-center">
                    <div className="text-6xl mb-4">&#10003;</div>
                    <p className="text-lg font-semibold text-green-600">Connected!</p>
                  </div>
                </div>
              ) : qrCode ? (
                <img
                  src={qrCode}
                  alt="QR Code"
                  className="w-75 h-75"
                />
              ) : (
                <div className="w-75 h-75 flex items-center justify-center flex-col gap-2">
                  <p className="text-sm text-gray-500">No QR code available</p>
                  {errorMessage && (
                    <Button variant="outline" size="sm" onClick={handleRefreshQR}>
                      Try Again
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2 text-sm text-gray-600">
            <p className="font-semibold text-gray-900">Instructions:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Open WhatsApp on your phone</li>
              <li>Go to Settings → Linked Devices</li>
              <li>Tap &quot;Link a Device&quot;</li>
              <li>Scan this QR code</li>
            </ol>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleRefreshQR}
              disabled={isLoading}
            >
              Refresh QR
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
