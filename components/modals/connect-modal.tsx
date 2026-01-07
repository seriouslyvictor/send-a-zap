"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectModal({ open, onOpenChange }: ConnectModalProps) {
  const [qrCode, setQrCode] = useState<string>("https://via.placeholder.com/300");
  const [status, setStatus] = useState<string>("Waiting for QR scan...");
  const [autoDisconnect, setAutoDisconnect] = useState<string>("30");
  const [keepAlive, setKeepAlive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleRefreshQR = async () => {
    setIsLoading(true);
    // TODO: Call API to refresh QR code
    setTimeout(() => {
      setIsLoading(false);
      setStatus("QR Code refreshed");
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Connect WhatsApp</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status */}
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">{status}</p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
              {isLoading ? (
                <div className="w-[300px] h-[300px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <img
                  src={qrCode}
                  alt="QR Code"
                  className="w-[300px] h-[300px]"
                />
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

          {/* Settings */}
          <div className="space-y-4 border-t pt-4">
            <p className="text-sm font-semibold text-gray-900">⚙️ Settings:</p>

            {/* Auto-disconnect */}
            <div className="space-y-2">
              <Label htmlFor="auto-disconnect">Auto-disconnect after:</Label>
              <Select
                value={autoDisconnect}
                onValueChange={setAutoDisconnect}
                disabled={keepAlive}
              >
                <SelectTrigger id="auto-disconnect">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Keep alive */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="keep-alive"
                checked={keepAlive}
                onCheckedChange={(checked) => setKeepAlive(checked as boolean)}
              />
              <Label
                htmlFor="keep-alive"
                className="text-sm font-normal cursor-pointer"
              >
                Keep session alive indefinitely
              </Label>
            </div>
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
