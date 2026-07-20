"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Loader2, RefreshCw } from "lucide-react";

import { connectionDisplayNumber } from "@/lib/connection-display";
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

type Step = "consent" | "pairing";

const STATUS_POLL_MS = 3_000;
const QR_REFRESH_MS = 45_000;

export function ConnectModal({ open, onOpenChange, onConnected }: ConnectModalProps) {
  const [step, setStep] = useState<Step>("consent");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState("Waiting to start");
  const [connectedNumber, setConnectedNumber] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connectedRef = useRef(false);

  const loadQRCode = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setStatus("Generating a secure QR code…");

    try {
      const response = await fetch("/api/evolution/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Could not create Connection");
      }

      if (data.alreadyConnected) {
        connectedRef.current = true;
        setIsConnected(true);
        setConnectedNumber(connectionDisplayNumber(data.owner));
        setStatus("Connected");
        onConnected?.();
        return;
      }

      setQrCode(data.qrCode || null);
      setStatus(data.qrCode ? "Waiting for QR scan" : "Waiting for a fresh QR code…");
      if (!data.qrCode) setError("QR code is not ready yet. Retrying automatically.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create Connection");
      setStatus("Connection could not be started");
    } finally {
      setIsLoading(false);
    }
  }, [onConnected]);

  const checkStatus = useCallback(async () => {
    if (connectedRef.current) return;

    try {
      const response = await fetch("/api/evolution/status", { cache: "no-store" });
      const data = await response.json();
      if (response.ok && data.success && data.connected) {
        connectedRef.current = true;
        setIsConnected(true);
        setConnectedNumber(connectionDisplayNumber(data.owner));
        setStatus("Connected");
        setError(null);
        onConnected?.();
      } else if (response.ok && data.success) {
        setStatus("Waiting for QR scan");
      }
    } catch {
      // The next poll will retry; QR remains usable while status is temporarily unavailable.
    }
  }, [onConnected]);

  useEffect(() => {
    if (!open) return;
    connectedRef.current = false;
    setStep("consent");
    setQrCode(null);
    setStatus("Waiting to start");
    setConnectedNumber(null);
    setIsConnected(false);
    setIsLoading(false);
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open || step !== "pairing" || isConnected) return;

    const statusTimer = window.setInterval(() => void checkStatus(), STATUS_POLL_MS);
    const qrTimer = window.setInterval(() => void loadQRCode(), QR_REFRESH_MS);
    return () => {
      window.clearInterval(statusTimer);
      window.clearInterval(qrTimer);
    };
  }, [checkStatus, isConnected, loadQRCode, open, step]);

  async function acceptAndConnect() {
    setStep("pairing");
    await loadQRCode();
  }

  function refreshQRCode() {
    setQrCode(null);
    void loadQRCode();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {step === "consent" ? (
          <>
            <DialogHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-700" />
              </div>
              <DialogTitle className="text-xl">Before you connect WhatsApp</DialogTitle>
              <DialogDescription>
                This demo sends real WhatsApp messages from the account you connect.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4 text-sm text-red-950">
                <p className="font-bold">Only message yourself or known people who consented.</p>
                <p className="mt-2 font-bold">Never connect your personal WhatsApp number.</p>
              </div>

              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <Clock3 className="mt-0.5 h-5 w-5 shrink-0" />
                <p>
                  For safety, the Idle Disconnect policy automatically removes an inactive
                  Connection from the server. You can also disconnect it at any time.
                </p>
              </div>

              <p className="text-sm text-muted-foreground">
                Continuing confirms that you understand these messages are real and that every
                recipient has agreed to receive them.
              </p>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={acceptAndConnect}
                  className="bg-red-700 text-white hover:bg-red-800"
                >
                  I understand — create Connection
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Connect WhatsApp</DialogTitle>
              <DialogDescription>
                Open WhatsApp → Linked devices → Link a device, then scan this code.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <div
                className={`rounded-lg border p-3 text-center text-sm font-medium ${
                  isConnected
                    ? "border-green-200 bg-green-50 text-green-800"
                    : error
                      ? "border-red-200 bg-red-50 text-red-800"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
                aria-live="polite"
              >
                {status}
                {error && <p className="mt-1 text-xs font-normal">{error}</p>}
              </div>

              <div className="mx-auto flex aspect-square w-full max-w-75 items-center justify-center rounded-xl border-2 border-gray-200 bg-white p-4">
                {isConnected ? (
                  <div className="text-center text-green-700">
                    <CheckCircle2 className="mx-auto mb-3 h-16 w-16" />
                    <p className="font-semibold">
                      Connected as {connectedNumber || "WhatsApp account"}
                    </p>
                  </div>
                ) : isLoading ? (
                  <Loader2 className="h-12 w-12 animate-spin text-green-600" />
                ) : qrCode ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrCode} alt="WhatsApp Connection QR code" className="h-full w-full" />
                ) : (
                  <div className="text-center text-sm text-gray-500">
                    <p>No QR code available yet.</p>
                    <p className="mt-1">A fresh code will be requested automatically.</p>
                  </div>
                )}
              </div>

              {!isConnected && (
                <p className="text-center text-xs text-muted-foreground">
                  QR codes expire quickly. This screen refreshes the code automatically.
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                {!isConnected && (
                  <Button variant="outline" onClick={refreshQRCode} disabled={isLoading}>
                    <RefreshCw className="h-4 w-4" />
                    Refresh QR now
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
