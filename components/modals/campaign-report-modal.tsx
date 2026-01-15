"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, MailIcon, CheckIcon, ListCheckIcon, CrossIcon } from "lucide-react";
import { CAMPAIGN_STATUS_CONFIG, CampaignStatusType } from "@/types/campaign";

interface Message {
  id: string;
  phone: string;
  name: string | null;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  errorMessage: string | null;
}

interface CampaignData {
  id: string;
  name: string;
  status: string;
  totalContacts: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  createdAt: string;
  startedAt: string | null;
}

interface CampaignReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string | null;
}

export function CampaignReportModal({
  open,
  onOpenChange,
  campaignId,
}: CampaignReportModalProps): React.ReactElement {
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [limit, setLimit] = useState("50");

  // Fetch campaign and messages
  useEffect(() => {
    if (!open || !campaignId) {
      setCampaign(null);
      setMessages([]);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch campaign details
        const campaignResponse = await fetch(`/api/campaigns/${campaignId}`);
        const campaignData = await campaignResponse.json();

        if (campaignData.success) {
          setCampaign(campaignData.data);
        }

        // Fetch messages for this campaign
        const messagesResponse = await fetch(
          `/api/campaigns/${campaignId}/messages?limit=${limit}`
        );
        const messagesData = await messagesResponse.json();

        if (messagesData.success) {
          setMessages(messagesData.data);
        }
      } catch (error) {
        console.error("Error fetching campaign report:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [open, campaignId, limit]);

  function getStatusBadge(status: string) {
    return CAMPAIGN_STATUS_CONFIG[status as CampaignStatusType] || {
      color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      label: status,
      variant: "outline" as const,
    };
  }

  function getMessageStatusBadge(status: string): { color: string; label: string } {
    const statusConfig: Record<string, { color: string; label: string }> = {
      PENDING: { color: "bg-gray-100 text-gray-700", label: "Pendente" },
      QUEUED: { color: "bg-blue-100 text-blue-700", label: "Na Fila" },
      SENT: { color: "bg-indigo-100 text-indigo-700", label: "Enviada" },
      DELIVERED: { color: "bg-green-100 text-green-700", label: "Entregue" },
      READ: { color: "bg-emerald-100 text-emerald-700", label: "Lida" },
      FAILED: { color: "bg-red-100 text-red-700", label: "Falhou" },
    };

    return statusConfig[status] || { color: "bg-gray-100 text-gray-700", label: status };
  }

  function formatDateTime(dateString: string | null): string {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-12rem)] sm:max-w-[calc(100vw-4rem)] w-[calc(100vw-12rem)] max-h-[calc(100vh-4rem)] h-[calc(100vh-4rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relatório da Campanha</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : campaign ? (
          <div className="space-y-6">
            {/* Campaign Summary */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{campaign.name}</h3>
                <Badge
                  variant="outline"
                  className={getStatusBadge(campaign.status).color}
                >
                  {(() => {
                    const statusBadge = getStatusBadge(campaign.status);
                    const Icon = statusBadge.icon;
                    return (
                      <span className="flex items-center gap-1.5">
                        <Icon className={`w-3.5 h-3.5 ${campaign.status === 'RUNNING' ? 'animate-spin' : ''}`} />
                        {statusBadge.label}
                      </span>
                    );
                  })()}
                </Badge>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
                      <MailIcon size={16} />
                      Enviadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{campaign.sentCount}</div>
                    <p className="text-xs text-gray-500">
                      de {campaign.totalContacts}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
                      <CheckIcon size={16} />
                      Entregues
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{campaign.deliveredCount}</div>
                    <p className="text-xs text-green-600">
                      {campaign.sentCount > 0
                        ? Math.round((campaign.deliveredCount / campaign.sentCount) * 100)
                        : 0}
                      % taxa de entrega
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
                      <ListCheckIcon size={16} />
                      Lidas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{campaign.readCount}</div>
                    <p className="text-xs text-blue-600">
                      {campaign.sentCount > 0
                        ? Math.round((campaign.readCount / campaign.sentCount) * 100)
                        : 0}
                      % taxa de leitura
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
                      <CrossIcon size={16} />
                      Falhadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {campaign.failedCount}
                    </div>
                    <p className="text-xs text-red-600">
                      {campaign.sentCount > 0
                        ? Math.round((campaign.failedCount / campaign.sentCount) * 100)
                        : 0}
                      % taxa de falha
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Messages Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold">
                  Mensagens ({messages.length})
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Mostrar:</span>
                  <Select value={limit} onValueChange={setLimit}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 mensagens</SelectItem>
                      <SelectItem value="50">50 mensagens</SelectItem>
                      <SelectItem value="100">100 mensagens</SelectItem>
                      <SelectItem value="250">250 mensagens</SelectItem>
                      <SelectItem value="500">500 mensagens</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Enviada</TableHead>
                      <TableHead>Entregue</TableHead>
                      <TableHead>Lida</TableHead>
                      <TableHead>Erro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                          Nenhuma mensagem encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      messages.map((message) => {
                        const statusBadge = getMessageStatusBadge(message.status);
                        return (
                          <TableRow key={message.id}>
                            <TableCell className="font-mono text-sm">
                              {message.phone}
                            </TableCell>
                            <TableCell>{message.name || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusBadge.color}>
                                {statusBadge.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {formatDateTime(message.sentAt)}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {formatDateTime(message.deliveredAt)}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {formatDateTime(message.readAt)}
                            </TableCell>
                            <TableCell className="text-sm text-red-600">
                              {message.errorMessage ? (
                                <span title={message.errorMessage}>
                                  {message.errorMessage.substring(0, 30)}...
                                </span>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            Nenhuma campanha selecionada
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
