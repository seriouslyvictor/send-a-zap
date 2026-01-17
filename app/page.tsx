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
import dynamic from "next/dynamic";
import { Edit, BarChart, Pause, X, Eye, Loader2, Play, FolderOpen, Rocket, FileText } from "lucide-react";
import { MailIcon } from "@/components/icons/mail-icon";
import { CheckIcon } from "@/components/icons/check-icon";
import { CheckListIcon } from "@/components/icons/check-list-icon";
import { CrossIcon } from "@/components/icons/cross-icon";
import { EmptyState } from "@/components/ui/empty-state-beautiful-accessible-no-data-states";

// Dynamic imports for modals - only load when opened
const CampaignWizard = dynamic(() =>
  import("@/components/modals/campaign-wizard").then(mod => ({ default: mod.CampaignWizard })),
  { ssr: false }
);

const CampaignDetailsModal = dynamic(() =>
  import("@/components/modals/campaign-details-modal").then(mod => ({ default: mod.CampaignDetailsModal })),
  { ssr: false }
);

const CampaignReportModal = dynamic(() =>
  import("@/components/modals/campaign-report-modal").then(mod => ({ default: mod.CampaignReportModal })),
  { ssr: false }
);
import { Campaign, CAMPAIGN_STATUS_CONFIG, CampaignStatusType } from "@/types/campaign";
import { DashboardStats, ComparisonData, SelectedCampaignDetails } from "@/types/dashboard-stats";

// Extract utility functions outside component to avoid recreation on every render
function formatNumber(num: number): string {
  return num.toLocaleString("pt-BR");
}

function getComparisonSubtitle(comparison: ComparisonData | null): string {
  if (!comparison) {
    return "Total enviadas";
  }

  let arrow: string;
  if (comparison.changePercent > 0) {
    arrow = "↑";
  } else if (comparison.changePercent < 0) {
    arrow = "↓";
  } else {
    arrow = "→";
  }

  return `${arrow} ${Math.abs(comparison.changePercent)}% vs ontem`;
}

function getDeliveryTrend(rate: number): "up" | "neutral" | "down" {
  if (rate >= 90) return "up";
  if (rate >= 70) return "neutral";
  return "down";
}

function getReadTrend(rate: number): "up" | "neutral" | "down" {
  if (rate >= 50) return "up";
  if (rate >= 30) return "neutral";
  return "down";
}

function getFailureTrend(rate: number): "up" | "neutral" | "down" {
  if (rate <= 5) return "up";
  if (rate <= 10) return "neutral";
  return "down";
}

function calculateProgress(campaign: Campaign): number {
  if (campaign.totalContacts === 0) return 0;
  return Math.round((campaign.sentCount / campaign.totalContacts) * 100);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", { month: "short", day: "numeric" });
}

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

function getStatusBadge(status: string) {
  return CAMPAIGN_STATUS_CONFIG[status as CampaignStatusType] || {
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    label: status,
    variant: "outline" as const,
    icon: FileText
  };
}

export default function DashboardPage(): React.ReactElement {
  // Modal states
  const [campaignWizardOpen, setCampaignWizardOpen] = useState(false);
  const [campaignDetailsOpen, setCampaignDetailsOpen] = useState(false);
  const [campaignReportOpen, setCampaignReportOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<SelectedCampaignDetails | null>(null);
  const [selectedCampaignForReport, setSelectedCampaignForReport] = useState<string | null>(null);

  // Data states
  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingActive, setIsLoadingActive] = useState(true);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isInitialLoadActive, setIsInitialLoadActive] = useState(true);
  const [isInitialLoadRecent, setIsInitialLoadRecent] = useState(true);
  const [isInitialLoadStats, setIsInitialLoadStats] = useState(true);

  async function fetchStats(isInitialLoad = false): Promise<void> {
    if (isInitialLoad) {
      setIsLoadingStats(true);
    }
    try {
      const response = await fetch("/api/dashboard/stats?period=today");
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    } finally {
      if (isInitialLoad) {
        setIsLoadingStats(false);
        setIsInitialLoadStats(false);
      }
    }
  };

  async function fetchActiveCampaigns(isInitialLoad = false): Promise<void> {
    if (isInitialLoad) {
      setIsLoadingActive(true);
    }
    try {
      const response = await fetch("/api/campaigns?status=RUNNING");
      const data = await response.json();
      if (data.success) {
        setActiveCampaigns(data.data);
      }
    } catch (error) {
      console.error("Erro ao buscar campanhas ativas:", error);
    } finally {
      if (isInitialLoad) {
        setIsLoadingActive(false);
        setIsInitialLoadActive(false);
      }
    }
  };

  async function fetchRecentCampaigns(isInitialLoad = false): Promise<void> {
    if (isInitialLoad) {
      setIsLoadingRecent(true);
    }
    try {
      const response = await fetch("/api/campaigns?limit=10");
      const data = await response.json();
      if (data.success) {
        setRecentCampaigns(data.data);
      }
    } catch (error) {
      console.error("Erro ao buscar campanhas recentes:", error);
    } finally {
      if (isInitialLoad) {
        setIsLoadingRecent(false);
        setIsInitialLoadRecent(false);
      }
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchStats(true);
    fetchActiveCampaigns(true);
    fetchRecentCampaigns(true);
  }, []);

  // Polling for active campaigns (every 5 seconds)
  useEffect(() => {
    // Only poll if there are active campaigns and initial load is done
    if (activeCampaigns.length === 0 || isInitialLoadActive) return;

    const pollInterval = setInterval(() => {
      fetchActiveCampaigns(false); // false = not initial load, don't show spinner
    }, 5000); // 5 seconds

    return () => clearInterval(pollInterval);
  }, [activeCampaigns.length, isInitialLoadActive]);

  // Polling for recent campaigns (every 10 seconds)
  useEffect(() => {
    // Only poll if there are recent campaigns and initial load is done
    if (recentCampaigns.length === 0 || isInitialLoadRecent) return;

    const pollInterval = setInterval(() => {
      fetchRecentCampaigns(false); // false = not initial load, don't show spinner
    }, 10000); // 10 seconds

    return () => clearInterval(pollInterval);
  }, [recentCampaigns.length, isInitialLoadRecent]);

  // Polling for dashboard stats (every 30 seconds)
  useEffect(() => {
    // Only poll if stats are loaded and initial load is done
    if (!stats || isInitialLoadStats) return;

    const pollInterval = setInterval(() => {
      fetchStats(false); // false = not initial load, don't show spinner
    }, 30000); // 30 seconds

    return () => clearInterval(pollInterval);
  }, [stats, isInitialLoadStats]);

  function handleCampaignCreated(): void {
    fetchStats(false); // Don't show loading spinner on refresh
    fetchActiveCampaigns(false); // Don't show loading spinner on refresh
    fetchRecentCampaigns(false); // Don't show loading spinner on refresh
  };

  // Prepare stats cards data
  const statsCards = stats ? [
    {
      icon: <MailIcon size={20} />,
      title: stats.sent.label,
      value: formatNumber(stats.sent.total),
      subtitle: getComparisonSubtitle(stats.comparison),
      trend: stats.comparison?.trend || "neutral",
    },
    {
      icon: <CheckIcon size={20} />,
      title: stats.delivered.label,
      value: formatNumber(stats.delivered.total),
      subtitle: `${stats.delivered.rate}% taxa de entrega`,
      trend: getDeliveryTrend(stats.delivered.rate),
    },
    {
      icon: <CheckListIcon size={20} />,
      title: stats.read.label,
      value: formatNumber(stats.read.total),
      subtitle: `${stats.read.rate}% taxa de leitura`,
      trend: getReadTrend(stats.read.rate),
    },
    {
      icon: <CrossIcon size={20} />,
      title: stats.failed.label,
      value: formatNumber(stats.failed.total),
      subtitle: `${stats.failed.rate}% taxa de falha`,
      trend: getFailureTrend(stats.failed.rate),
    },
  ] : [];

  return (
    <div className="space-y-6 md:space-y-8 p-4 md:p-0">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {isLoadingStats ? (
          // Loading skeleton for stats
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32" />
              </CardContent>
            </Card>
          ))
        ) : (
          statsCards.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
                  <span className="shrink-0">{stat.icon}</span>
                  <span className="truncate">{stat.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white truncate">
                  {stat.value}
                </div>
                <p
                  className={`text-xs mt-1 ${getTrendColorClass(stat.trend)}`}
                >
                  {stat.subtitle}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="default" onClick={() => setCampaignWizardOpen(true)} className="w-full sm:w-auto">
              <Edit className="w-4 h-4 mr-2" />
              Nova Convocação
            </Button>
            <Button variant="outline" className="w-full sm:w-auto">
              <BarChart className="w-4 h-4 mr-2" />
              Ver Relatórios
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Campanhas Ativas ({activeCampaigns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingActive ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : activeCampaigns.length === 0 ? (
            <EmptyState
              title="Nenhuma Campanha Ativa"
              message="Não há campanhas em execução no momento. Crie uma nova campanha para começar a enviar mensagens aos seus contatos."
              actionLabel="Criar Campanha"
              actionIcon={Rocket}
              onActionClick={() => setCampaignWizardOpen(true)}
              mainIcon={Play}
            />
          ) : (
            <div className="overflow-x-auto -mx-6 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Nome</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="whitespace-nowrap">Progresso</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeCampaigns.map((campaign) => {
                  const progress = calculateProgress(campaign);
                  const statusBadge = getStatusBadge(campaign.status);
                  const StatusIcon = statusBadge.icon;
                  return (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium dark:text-gray-200 text-sm">
                        {campaign.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${statusBadge.color} text-xs`}>
                          <span className="flex items-center gap-1.5">
                            <StatusIcon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${campaign.status === 'RUNNING' ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">{statusBadge.label}</span>
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-[200px]">
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span>
                              {campaign.sentCount}/{campaign.totalContacts}
                            </span>
                            <span className="text-gray-500">{progress}%</span>
                          </div>
                          <Progress value={progress} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 sm:gap-2">
                          <Button variant="ghost" size="sm" title="Pausar campanha" className="h-8 w-8 p-0">
                            <Pause className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Parar campanha" className="h-8 w-8 p-0">
                            <X className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Ver detalhes"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setSelectedCampaign({
                                id: campaign.id,
                                name: campaign.name,
                                status: campaign.status,
                                startedAt: campaign.startedAt || "Não iniciada",
                                estimatedCompletion: "Calculando...",
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
                                message: "Mensagem da campanha...",
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
            </div>
            </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Campaigns */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base sm:text-lg">Campanhas Recentes (Últimas 10)</CardTitle>
            <Button variant="link" className="text-blue-600 w-fit" asChild>
              <a href="/campaigns">Ver Todas →</a>
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
              title="Ainda Não Há Campanhas"
              message="Você ainda não criou nenhuma campanha. Comece criando sua primeira campanha para enviar mensagens aos seus contatos."
              actionLabel="Criar Primeira Campanha"
              actionIcon={Rocket}
              onActionClick={() => setCampaignWizardOpen(true)}
              mainIcon={FolderOpen}
            />
          ) : (
            <div className="overflow-x-auto -mx-6 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Nome da Campanha</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Enviadas</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Entregues</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Lidas</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Falhadas</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Data</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCampaigns.map((campaign) => {
                  const statusBadge = getStatusBadge(campaign.status);
                  const StatusIcon = statusBadge.icon;
                  return (
                    <TableRow
                      key={campaign.id}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <TableCell className="font-medium dark:text-gray-200 text-sm">
                        {campaign.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${statusBadge.color} text-xs`}>
                          <span className="flex items-center gap-1.5">
                            <StatusIcon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${campaign.status === 'RUNNING' ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">{statusBadge.label}</span>
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">{campaign.sentCount}</TableCell>
                      <TableCell className="text-right text-sm">
                        {campaign.deliveredCount}
                      </TableCell>
                      <TableCell className="text-right text-sm">{campaign.readCount}</TableCell>
                      <TableCell className="text-right text-red-600 dark:text-red-400 text-sm">
                        {campaign.failedCount}
                      </TableCell>
                      <TableCell className="text-right text-gray-500 dark:text-gray-400 text-xs sm:text-sm whitespace-nowrap">
                        {formatDate(campaign.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Ver relatório"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setSelectedCampaignForReport(campaign.id);
                            setCampaignReportOpen(true);
                          }}
                        >
                          <BarChart className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
            </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals - Conditionally render to avoid loading until needed */}
      {campaignWizardOpen && (
        <CampaignWizard
          open={campaignWizardOpen}
          onOpenChange={setCampaignWizardOpen}
          onCampaignCreated={handleCampaignCreated}
        />
      )}
      {campaignDetailsOpen && (
        <CampaignDetailsModal
          open={campaignDetailsOpen}
          onOpenChange={setCampaignDetailsOpen}
          campaign={selectedCampaign}
        />
      )}
      {campaignReportOpen && (
        <CampaignReportModal
          open={campaignReportOpen}
          onOpenChange={setCampaignReportOpen}
          campaignId={selectedCampaignForReport}
        />
      )}
    </div>
  );
}
