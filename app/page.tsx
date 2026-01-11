"use client";

import { useState, useEffect } from "react";
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
import { Upload, Edit, BarChart, Pause, X, Eye, Loader2, Play, FolderOpen, Rocket } from "lucide-react";
import { MailIcon } from "@/components/icons/mail-icon";
import { CheckIcon } from "@/components/icons/check-icon";
import { CheckListIcon } from "@/components/icons/check-list-icon";
import { CrossIcon } from "@/components/icons/cross-icon";
import { UploadContactsModal } from "@/components/modals/upload-contacts-modal";
import { CampaignWizard } from "@/components/modals/campaign-wizard";
import { CampaignDetailsModal } from "@/components/modals/campaign-details-modal";
import { EmptyState } from "@/components/ui/empty-state-beautiful-accessible-no-data-states";

interface Campaign {
  id: string;
  name: string;
  status: string;
  totalContacts: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  createdAt: string;
  startedAt?: string;
}

export default function DashboardPage() {
  // Modal states
  const [uploadContactsOpen, setUploadContactsOpen] = useState(false);
  const [campaignWizardOpen, setCampaignWizardOpen] = useState(false);
  const [campaignDetailsOpen, setCampaignDetailsOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);

  // Data states
  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [isLoadingActive, setIsLoadingActive] = useState(true);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);

  // Mock data for demonstration (stats will be calculated from real data later)
  const stats = [
    {
      icon: <MailIcon size={20} />,
      title: "Sent Today",
      value: "1,234",
      subtitle: "↑ 12% vs yesterday",
      trend: "up",
    },
    {
      icon: <CheckIcon size={20} />,
      title: "Delivered",
      value: "1,156",
      subtitle: "94% delivery rate",
      trend: "up",
    },
    {
      icon: <CheckListIcon size={20} />,
      title: "Read",
      value: "892",
      subtitle: "72% read rate",
      trend: "neutral",
    },
    {
      icon: <CrossIcon size={20} />,
      title: "Failed",
      value: "78",
      subtitle: "6% failure rate",
      trend: "down",
    },
  ];

  // Fetch active campaigns (RUNNING status)
  const fetchActiveCampaigns = async () => {
    setIsLoadingActive(true);
    try {
      const response = await fetch("/api/campaigns?status=RUNNING");
      const data = await response.json();
      if (data.success) {
        setActiveCampaigns(data.data);
      }
    } catch (error) {
      console.error("Error fetching active campaigns:", error);
    } finally {
      setIsLoadingActive(false);
    }
  };

  // Fetch recent campaigns (top 10 latest created)
  const fetchRecentCampaigns = async () => {
    setIsLoadingRecent(true);
    try {
      const response = await fetch("/api/campaigns?limit=10");
      const data = await response.json();
      if (data.success) {
        setRecentCampaigns(data.data);
      }
    } catch (error) {
      console.error("Error fetching recent campaigns:", error);
    } finally {
      setIsLoadingRecent(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchActiveCampaigns();
    fetchRecentCampaigns();
  }, []);

  // Refresh data when campaign wizard closes
  const handleCampaignCreated = () => {
    fetchActiveCampaigns();
    fetchRecentCampaigns();
  };

  // Calculate progress percentage
  const calculateProgress = (campaign: Campaign) => {
    if (campaign.totalContacts === 0) return 0;
    return Math.round((campaign.sentCount / campaign.totalContacts) * 100);
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Get trend color class
  function getTrendColorClass(trend: string): string {
    switch (trend) {
      case "up":
        return "text-green-600 dark:text-green-400";
      case "down":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-500 dark:text-gray-400";
    }
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
                {stat.icon} {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </div>
              <p
                className={`text-xs mt-1 ${getTrendColorClass(stat.trend)}`}
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
              <Upload className="w-4 h-4 mr-2" />
              Upload Contacts
            </Button>
            <Button variant="default" onClick={() => setCampaignWizardOpen(true)}>
              <Edit className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
            <Button variant="outline">
              <BarChart className="w-4 h-4 mr-2" />
              View Reports
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Active Campaigns ({activeCampaigns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingActive ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : activeCampaigns.length === 0 ? (
            <EmptyState
              title="No Active Campaigns"
              message="There are currently no campaigns running. Create a new campaign to start sending messages to your contacts."
              actionLabel="Create Campaign"
              actionIcon={Rocket}
              onActionClick={() => setCampaignWizardOpen(true)}
              mainIcon={Play}
            />
          ) : (
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
                {activeCampaigns.map((campaign) => {
                  const progress = calculateProgress(campaign);
                  return (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium dark:text-gray-200">
                        {campaign.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-green-500">
                          Running
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-50">
                          <div className="flex justify-between text-sm">
                            <span>
                              {campaign.sentCount}/{campaign.totalContacts}
                            </span>
                            <span className="text-gray-500">{progress}%</span>
                          </div>
                          <Progress value={progress} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" title="Pause campaign">
                            <Pause className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Stop campaign">
                            <X className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="View details"
                            onClick={() => {
                              setSelectedCampaign({
                                id: campaign.id,
                                name: campaign.name,
                                status: campaign.status,
                                startedAt: campaign.startedAt || "Not started",
                                estimatedCompletion: "Calculating...",
                                progress,
                                sent: campaign.sentCount,
                                total: campaign.totalContacts,
                                delivered: campaign.deliveredCount,
                                read: campaign.readCount,
                                failed: campaign.failedCount,
                                batchSize: 50,
                                messageDelay: 2,
                                batchDelay: 30,
                                retries: true,
                                maxRetries: 3,
                                message: "Campaign message...",
                                failedMessages: [],
                              });
                              setCampaignDetailsOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Campaigns */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Campaigns (Last 10)</CardTitle>
            <Button variant="link" className="text-blue-600" asChild>
              <a href="/campaigns">View All →</a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingRecent ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : recentCampaigns.length === 0 ? (
            <EmptyState
              title="No Campaigns Yet"
              message="You haven't created any campaigns yet. Get started by creating your first campaign to send messages to your contacts."
              actionLabel="Create First Campaign"
              actionIcon={Rocket}
              onActionClick={() => setCampaignWizardOpen(true)}
              mainIcon={FolderOpen}
            />
          ) : (
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
                  <TableRow
                    key={campaign.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <TableCell className="font-medium dark:text-gray-200">
                      {campaign.name}
                    </TableCell>
                    <TableCell className="text-right">{campaign.sentCount}</TableCell>
                    <TableCell className="text-right">
                      {campaign.deliveredCount}
                    </TableCell>
                    <TableCell className="text-right">{campaign.readCount}</TableCell>
                    <TableCell className="text-right text-red-600 dark:text-red-400">
                      {campaign.failedCount}
                    </TableCell>
                    <TableCell className="text-right text-gray-500 dark:text-gray-400">
                      {formatDate(campaign.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" title="View report">
                        <BarChart className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
        onCampaignCreated={handleCampaignCreated}
      />
      <CampaignDetailsModal
        open={campaignDetailsOpen}
        onOpenChange={setCampaignDetailsOpen}
        campaign={selectedCampaign}
      />
    </div>
  );
}
