"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UploadContactsModal } from "@/components/modals/upload-contacts-modal";
import { CampaignWizard } from "@/components/modals/campaign-wizard";
import { CampaignDetailsModal } from "@/components/modals/campaign-details-modal";

export default function DashboardPage() {
  // Modal states
  const [uploadContactsOpen, setUploadContactsOpen] = useState(false);
  const [campaignWizardOpen, setCampaignWizardOpen] = useState(false);
  const [campaignDetailsOpen, setCampaignDetailsOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  // Mock data for demonstration
  const stats = [
    {
      icon: "📨",
      title: "Sent Today",
      value: "1,234",
      subtitle: "↑ 12% vs yesterday",
      trend: "up",
    },
    {
      icon: "✅",
      title: "Delivered",
      value: "1,156",
      subtitle: "94% delivery rate",
      trend: "up",
    },
    {
      icon: "📖",
      title: "Read",
      value: "892",
      subtitle: "72% read rate",
      trend: "neutral",
    },
    {
      icon: "❌",
      title: "Failed",
      value: "78",
      subtitle: "6% failure rate",
      trend: "down",
    },
  ];

  const activeCampaigns = [
    {
      id: 1,
      name: "Summer Sale",
      status: "Running",
      progress: 86,
      sent: 856,
      total: 1000,
    },
    {
      id: 2,
      name: "Welcome Series",
      status: "Running",
      progress: 29,
      sent: 145,
      total: 500,
    },
  ];

  const recentCampaigns = [
    {
      id: 1,
      name: "Black Friday 2026",
      sent: 1234,
      delivered: 1156,
      read: 892,
      failed: 78,
      date: "Jan 5",
    },
    {
      id: 2,
      name: "New Year Promo",
      sent: 567,
      delivered: 545,
      read: 423,
      failed: 22,
      date: "Jan 1",
    },
    {
      id: 3,
      name: "Holiday Special",
      sent: 892,
      delivered: 870,
      read: 654,
      failed: 22,
      date: "Dec 28",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.icon} {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {stat.value}
              </div>
              <p
                className={`text-xs mt-1 ${
                  stat.trend === "up"
                    ? "text-green-600"
                    : stat.trend === "down"
                    ? "text-red-600"
                    : "text-gray-500"
                }`}
              >
                {stat.subtitle}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button variant="default" onClick={() => setUploadContactsOpen(true)}>
              📤 Upload Contacts
            </Button>
            <Button variant="default" onClick={() => setCampaignWizardOpen(true)}>
              ✏️ New Campaign
            </Button>
            <Button variant="outline">📊 View Reports</Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Active Campaigns ({activeCampaigns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeCampaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>
                    <Badge variant="default" className="bg-green-500">
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 min-w-50">
                      <div className="flex justify-between text-sm">
                        <span>
                          {campaign.sent}/{campaign.total}
                        </span>
                        <span className="text-gray-500">
                          {campaign.progress}%
                        </span>
                      </div>
                      <Progress value={campaign.progress} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        ⏸
                      </Button>
                      <Button variant="ghost" size="sm">
                        ✖
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCampaign({
                            id: campaign.id.toString(),
                            name: campaign.name,
                            status: campaign.status,
                            startedAt: "Jan 7, 2026 at 14:30",
                            estimatedCompletion: "15:15 (in 32 minutes)",
                            progress: campaign.progress,
                            sent: campaign.sent,
                            total: campaign.total,
                            delivered: Math.floor(campaign.sent * 0.93),
                            read: Math.floor(campaign.sent * 0.6),
                            failed: Math.floor(campaign.sent * 0.07),
                            batchSize: 50,
                            messageDelay: 2,
                            batchDelay: 30,
                            retries: true,
                            maxRetries: 3,
                            message: "Olá {{name}}! Temos novidades sobre o curso {{course}}.",
                            failedMessages: [
                              { phone: "5511987654321", name: "João", error: "Invalid number" },
                            ],
                          });
                          setCampaignDetailsOpen(true);
                        }}
                      >
                        👁
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Campaigns */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Campaigns (Last 30 days)</CardTitle>
            <Button variant="link" className="text-blue-600">
              View All →
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign Name</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Delivered</TableHead>
                <TableHead className="text-right">Read</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead className="text-right">Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentCampaigns.map((campaign) => (
                <TableRow key={campaign.id} className="cursor-pointer hover:bg-gray-50">
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell className="text-right">{campaign.sent}</TableCell>
                  <TableCell className="text-right">
                    {campaign.delivered}
                  </TableCell>
                  <TableCell className="text-right">{campaign.read}</TableCell>
                  <TableCell className="text-right text-red-600">
                    {campaign.failed}
                  </TableCell>
                  <TableCell className="text-right text-gray-500">
                    {campaign.date}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      📊
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modals */}
      <UploadContactsModal
        open={uploadContactsOpen}
        onOpenChange={setUploadContactsOpen}
      />
      <CampaignWizard
        open={campaignWizardOpen}
        onOpenChange={setCampaignWizardOpen}
      />
      <CampaignDetailsModal
        open={campaignDetailsOpen}
        onOpenChange={setCampaignDetailsOpen}
        campaign={selectedCampaign}
      />
    </div>
  );
}
