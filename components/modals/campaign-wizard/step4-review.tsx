"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Step4ReviewProps {
  onSubmit: () => void;
  onBack: () => void;
  campaignData: {
    campaignName: string;
    contactsCount: number;
    message: string;
    imageUrl?: string;
    batchSize: number;
    messageDelay: number;
    batchDelay: number;
    autoRetry: boolean;
    maxRetries: number;
    estimatedMinutes: number;
  };
}

export function Step4Review({ onSubmit, onBack, campaignData }: Step4ReviewProps) {
  const handleTestSend = () => {
    // TODO: Implement test send
    alert("Test send functionality will be implemented");
  };

  return (
    <div className="space-y-6">
      {/* Campaign Summary */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Campaign Summary:
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex">
            <span className="w-32 text-gray-600">📋 Name:</span>
            <span className="font-medium">{campaignData.campaignName}</span>
          </div>
          <div className="flex">
            <span className="w-32 text-gray-600">👥 Recipients:</span>
            <span className="font-medium">{campaignData.contactsCount} contacts</span>
          </div>
          <div className="flex">
            <span className="w-32 text-gray-600">📨 Message:</span>
            <span className="font-medium">
              {campaignData.message.substring(0, 50)}...
            </span>
          </div>
          {campaignData.imageUrl && (
            <div className="flex">
              <span className="w-32 text-gray-600">🖼️ Image:</span>
              <span className="font-medium">image.jpg (245 KB)</span>
            </div>
          )}
          <div className="flex">
            <span className="w-32 text-gray-600">⚙️ Batch size:</span>
            <span className="font-medium">{campaignData.batchSize} messages</span>
          </div>
          <div className="flex">
            <span className="w-32 text-gray-600">⏱️ Delays:</span>
            <span className="font-medium">
              {campaignData.messageDelay}s per message, {campaignData.batchDelay}s
              per batch
            </span>
          </div>
          <div className="flex">
            <span className="w-32 text-gray-600">🔄 Retries:</span>
            <span className="font-medium">
              {campaignData.autoRetry
                ? `Enabled (max ${campaignData.maxRetries})`
                : "Disabled"}
            </span>
          </div>
          <div className="flex">
            <span className="w-32 text-gray-600">⏰ Est. completion:</span>
            <span className="font-medium">{campaignData.estimatedMinutes} minutes</span>
          </div>
        </div>
      </div>

      {/* Message Preview */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          Message Preview:
        </h3>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <pre className="text-sm whitespace-pre-wrap font-sans">
            {campaignData.message}
          </pre>
        </div>
      </div>

      {/* Important Notice */}
      <Alert className="bg-yellow-50 border-yellow-200">
        <AlertDescription className="text-yellow-900">
          <strong>⚠️ Important:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>{campaignData.contactsCount} messages will be sent</li>
            <li>
              You&apos;ll be charged for {campaignData.contactsCount} messages
            </li>
            <li>Campaign cannot be fully stopped once started (only paused)</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Test Send */}
      <div>
        <Button variant="outline" onClick={handleTestSend}>
          Test Send to My Number
        </Button>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <Button onClick={onSubmit} className="bg-green-600 hover:bg-green-700">
          🚀 Start Campaign
        </Button>
      </div>
    </div>
  );
}
