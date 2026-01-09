"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FailedMessage {
  phone: string;
  name: string;
  error: string;
}

interface CampaignDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: {
    id: string;
    name: string;
    status: string;
    startedAt: string;
    estimatedCompletion: string;
    progress: number;
    sent: number;
    total: number;
    delivered: number;
    read: number;
    failed: number;
    batchSize: number;
    messageDelay: number;
    batchDelay: number;
    retries: boolean;
    maxRetries: number;
    message: string;
    failedMessages: FailedMessage[];
  };
}

export function CampaignDetailsModal({
  open,
  onOpenChange,
  campaign,
}: CampaignDetailsModalProps) {
  if (!campaign) return null;

  const deliveryRate = Math.round((campaign.delivered / campaign.sent) * 100);
  const readRate = Math.round((campaign.read / campaign.sent) * 100);
  const failureRate = Math.round((campaign.failed / campaign.sent) * 100);

  const handlePause = () => {
    if (confirm("Are you sure you want to pause this campaign?")) {
      // TODO: Implement pause functionality
      alert("Campaign paused");
    }
  };

  const handleCancel = () => {
    if (
      confirm(
        "Are you sure you want to cancel this campaign? This action cannot be undone."
      )
    ) {
      // TODO: Implement cancel functionality
      alert("Campaign cancelled");
    }
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    alert("Export report functionality will be implemented");
  };

  const handleRetry = (phone: string) => {
    // TODO: Implement retry functionality
    alert(`Retry sending to ${phone}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-200 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Campaign Details: {campaign.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Timeline */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">Status:</span>
              <Badge
                variant="default"
                className={
                  campaign.status === "Running"
                    ? "bg-green-500"
                    : campaign.status === "Paused"
                    ? "bg-yellow-500"
                    : "bg-gray-500"
                }
              >
                {campaign.status}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">
              Started: {campaign.startedAt}
            </p>
            <p className="text-sm text-gray-600">
              Est. completion: {campaign.estimatedCompletion}
            </p>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">Progress:</h3>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>
                  {campaign.sent} / {campaign.total}
                </span>
                <span className="text-gray-500">{campaign.progress}%</span>
              </div>
              <Progress value={campaign.progress} className="h-2" />
            </div>
          </div>

          {/* Statistics */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">📊 Statistics:</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-sm">
                • Sent: <span className="font-semibold">{campaign.sent}</span>
              </div>
              <div className="text-sm">
                • Delivered:{" "}
                <span className="font-semibold">
                  {campaign.delivered} ({deliveryRate}%)
                </span>
              </div>
              <div className="text-sm">
                • Read:{" "}
                <span className="font-semibold">
                  {campaign.read} ({readRate}%)
                </span>
              </div>
              <div className="text-sm text-red-600">
                • Failed:{" "}
                <span className="font-semibold">
                  {campaign.failed} ({failureRate}%)
                </span>
              </div>
            </div>
          </div>

          {/* Configuration */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">⚙️ Configuration:</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• Batch size: {campaign.batchSize} messages</p>
              <p>
                • Delay: {campaign.messageDelay}s per message, {campaign.batchDelay}s per
                batch
              </p>
              <p>
                • Retries: {campaign.retries ? "Enabled" : "Disabled"}
                {campaign.retries && ` (max ${campaign.maxRetries})`}
              </p>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">📝 Message:</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
              {campaign.message}
            </div>
          </div>

          {/* Failed Messages */}
          {campaign.failedMessages.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-900">
                Failed Messages ({campaign.failedMessages.length}):
              </h3>
              <div className="border rounded-lg overflow-hidden max-h-50 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Phone</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaign.failedMessages.map((msg, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">
                          {msg.phone}
                        </TableCell>
                        <TableCell>{msg.name}</TableCell>
                        <TableCell className="text-red-600 text-sm">
                          {msg.error}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetry(msg.phone)}
                          >
                            Retry
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 border-t pt-4">
            <div className="flex gap-3">
              <Button variant="outline" onClick={handlePause}>
                ⏸ Pause Campaign
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="text-red-600 hover:text-red-700"
              >
                ❌ Cancel & Delete Messages
              </Button>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleExport}>
                📊 Export Report
              </Button>
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
