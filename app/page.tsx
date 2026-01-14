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
import { Campaign, CAMPAIGN_STATUS_CONFIG, CampaignStatusType } from "@/types/campaign";

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
  const [isInitialLoadActive, setIsInitialLoadActive] = useState(true);
  const [isInitialLoadRecent, setIsInitialLoadRecent] = useState(true);

  // Mock data for demonstration (stats will be calculated from real data later)
  const stats = [
    {
      icon: <MailIcon size={20} />,
      title: "Enviadas Hoje",
      value: "1,234",
      subtitle: "↑ 12% vs ontem",
      trend: "up",
    },
    {
      icon: <CheckIcon size={20} />,
      title: "Entregues",
      value: "1,156",
      subtitle: "94% taxa de entrega",
      trend: "up",
    },
    {
      icon: <CheckListIcon size={20} />,
      title: "Lidas",
      value: "892",
      subtitle: "72% taxa de leitura",
      trend: "neutral",
    },
    {
      icon: <CrossIcon size={20} />,
      title: "Falhadas",
      value: "78",
      subtitle: "6% taxa de falha",
      trend: "down",
    },
  ];

  // Fetch active campaigns (RUNNING status)
  const fetchActiveCampaigns = async (isInitialLoad = false) => {
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

  // Fetch recent campaigns (top 10 latest created)
  const fetchRecentCampaigns = async (isInitialLoad = false) => {
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

  // Refresh data when campaign wizard closes
  const handleCampaignCreated = () => {
    fetchActiveCampaigns(false); // Don't show loading spinner on refresh
    fetchRecentCampaigns(false); // Don't show loading spinner on refresh
  };

  // Calculate progress percentage
  const calculateProgress = (campaign: Campaign) => {
    if (campaign.totalContacts === 0) return 0;
    return Math.round((campaign.sentCount / campaign.totalContacts) * 100);
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", { month: "short", day: "numeric" });
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

  // Get status badge config (using single source of truth)
  const getStatusBadge = (status: string) => {
    return CAMPAIGN_STATUS_CONFIG[status as CampaignStatusType] || {
      color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      label: status,
      variant: "outline" as const
    };
  };

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
          <CardTitle className="text-base">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button variant="default" onClick={() => setUploadContactsOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload de Contatos
            </Button>
            <Button variant="default" onClick={() => setCampaignWizardOpen(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Nova Campanha
            </Button>
            <Button variant="outline">
              <BarChart className="w-4 h-4 mr-2" />
              Ver Relatórios
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Campanhas Ativas ({activeCampaigns.length})</CardTitle>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeCampaigns.map((campaign) => {
                  const progress = calculateProgress(campaign);
                  const statusBadge = getStatusBadge(campaign.status);
                  return (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium dark:text-gray-200">
                        {campaign.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadge.color}>
                          {statusBadge.label}
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
                          <Button variant="ghost" size="sm" title="Pausar campanha">
                            <Pause className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Parar campanha">
                            <X className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Ver detalhes"
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
          )}
        </CardContent>
      </Card>

      {/* Recent Campaigns */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Campanhas Recentes (Últimas 10)</CardTitle>
            <Button variant="link" className="text-blue-600" asChild>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Campanha</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Enviadas</TableHead>
                  <TableHead className="text-right">Entregues</TableHead>
                  <TableHead className="text-right">Lidas</TableHead>
                  <TableHead className="text-right">Falhadas</TableHead>
                  <TableHead className="text-right">Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCampaigns.map((campaign) => {
                  const statusBadge = getStatusBadge(campaign.status);
                  return (
                    <TableRow
                      key={campaign.id}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <TableCell className="font-medium dark:text-gray-200">
                        {campaign.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadge.color}>
                          {statusBadge.label}
                        </Badge>
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
                        <Button variant="ghost" size="sm" title="Ver relatório">
                          <BarChart className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
