"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Step3ConfigureProps {
  onNext: (config: {
    campaignName: string;
    batchSize: number;
    messageDelay: number;
    batchDelay: number;
    autoRetry: boolean;
    maxRetries: number;
    retryDelay: number;
  }) => void;
  onBack: () => void;
  contactsCount: number;
}

export function Step3Configure({
  onNext,
  onBack,
  contactsCount,
}: Step3ConfigureProps) {
  const [campaignName, setCampaignName] = useState<string>("");
  const [batchSize, setBatchSize] = useState<string>("50");
  const [messageDelay, setMessageDelay] = useState<string>("2");
  const [batchDelay, setBatchDelay] = useState<string>("30");
  const [autoRetry, setAutoRetry] = useState<boolean>(false);
  const [maxRetries, setMaxRetries] = useState<string>("3");
  const [retryDelay, setRetryDelay] = useState<string>("5");

  const calculateEstimate = () => {
    const batches = Math.ceil(contactsCount / parseInt(batchSize));
    const timePerBatch =
      parseInt(batchSize) * parseInt(messageDelay) + parseInt(batchDelay);
    const totalSeconds = batches * timePerBatch;
    const minutes = Math.floor(totalSeconds / 60);
    return { minutes, batches };
  };

  const { minutes, batches } = calculateEstimate();

  const handleSubmit = () => {
    onNext({
      campaignName,
      batchSize: parseInt(batchSize),
      messageDelay: parseInt(messageDelay),
      batchDelay: parseInt(batchDelay),
      autoRetry,
      maxRetries: parseInt(maxRetries),
      retryDelay: parseInt(retryDelay),
    });
  };

  return (
    <div className="space-y-6">
      {/* Campaign Name */}
      <div className="space-y-2">
        <Label htmlFor="campaignName">Campaign Name:</Label>
        <Input
          id="campaignName"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          placeholder="e.g., Summer Sale Campaign"
        />
      </div>

      {/* Batch Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Batch Settings:</h3>

        <div className="space-y-2">
          <Label htmlFor="batchSize">Messages per batch:</Label>
          <Select value={batchSize} onValueChange={setBatchSize}>
            <SelectTrigger id="batchSize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">(Max 50 messages per batch)</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="messageDelay">Delay between messages:</Label>
          <Select value={messageDelay} onValueChange={setMessageDelay}>
            <SelectTrigger id="messageDelay">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 second</SelectItem>
              <SelectItem value="2">2 seconds</SelectItem>
              <SelectItem value="3">3 seconds</SelectItem>
              <SelectItem value="5">5 seconds</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">(Recommended: 1-3 seconds)</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="batchDelay">Delay between batches:</Label>
          <Select value={batchDelay} onValueChange={setBatchDelay}>
            <SelectTrigger id="batchDelay">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 seconds</SelectItem>
              <SelectItem value="60">60 seconds</SelectItem>
              <SelectItem value="120">2 minutes</SelectItem>
              <SelectItem value="300">5 minutes</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">(Recommended: 30-60 seconds)</p>
        </div>
      </div>

      {/* Retry Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Retry Settings:</h3>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="autoRetry"
            checked={autoRetry}
            onCheckedChange={(checked) => setAutoRetry(checked as boolean)}
          />
          <Label htmlFor="autoRetry" className="font-normal cursor-pointer">
            Auto-retry failed messages
          </Label>
        </div>

        {autoRetry && (
          <>
            <div className="space-y-2">
              <Label htmlFor="maxRetries">Max retries:</Label>
              <Select value={maxRetries} onValueChange={setMaxRetries}>
                <SelectTrigger id="maxRetries">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="retryDelay">Retry delay:</Label>
              <Select value={retryDelay} onValueChange={setRetryDelay}>
                <SelectTrigger id="retryDelay">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>

      {/* Estimate */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Estimated completion time:</strong> ~{minutes} minutes
        </p>
        <p className="text-xs text-blue-700 mt-1">
          ({contactsCount} contacts, {batches} batches)
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <Button onClick={handleSubmit} disabled={!campaignName}>
          Next: Review →
        </Button>
      </div>
    </div>
  );
}
