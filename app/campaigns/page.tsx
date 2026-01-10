"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2, RefreshCw } from "lucide-react";
import { DateRange } from "react-day-picker";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CampaignActions } from "@/components/campaign-actions";
import {
  Campaign,
  CampaignListResponse,
  CAMPAIGN_STATUS_CONFIG,
} from "@/types/campaign";

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: "DRAFT", label: "Rascunho" },
  { value: "PENDING", label: "Pendente" },
  { value: "RUNNING", label: "Em Execucao" },
  { value: "PAUSED", label: "Pausado" },
  { value: "COMPLETED", label: "Concluido" },
  { value: "CANCELLED", label: "Cancelado" },
  { value: "FAILED", label: "Falhou" },
];

function formatDateTime(date: string): string {
  return format(new Date(date), "dd/MM/yyyy HH:mm");
}

function calculateProgress(campaign: Campaign): number {
  if (campaign.totalContacts === 0) return 0;
  return Math.round((campaign.sentCount / campaign.totalContacts) * 100);
}

function formatDateRangeDisplay(dateRange: DateRange | undefined): string {
  if (!dateRange?.from) return "Selecione um periodo";
  if (!dateRange.to) return format(dateRange.from, "dd/MM/yyyy");
  return `${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}`;
}

export default function CampaignsListPage(): React.ReactElement {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ page: page.toString(), limit: "20" });

      if (statusFilter !== "ALL") {
        params.append("status", statusFilter);
      }
      if (dateRange?.from) {
        params.append("dateFrom", format(dateRange.from, "yyyy-MM-dd"));
      }
      if (dateRange?.to) {
        params.append("dateTo", format(dateRange.to, "yyyy-MM-dd"));
      }

      const response = await fetch(`/api/campaigns?${params.toString()}`);
      const data: CampaignListResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Erro ao carregar convocacoes");
      }

      setCampaigns(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      console.error("Error fetching campaigns:", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, dateRange]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  function handleClearFilters(): void {
    setStatusFilter("ALL");
    setDateRange(undefined);
    setPage(1);
  }

  const hasActiveFilters = statusFilter !== "ALL" || dateRange !== undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Convocacoes
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gerencie todas as suas convocacoes de WhatsApp
          </p>
        </div>
        <Button onClick={fetchCampaigns} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Status Filter */}
            <div className="flex flex-col gap-2 min-w-[200px]">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="flex flex-col gap-2 min-w-[280px]">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Periodo
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDateRangeDisplay(dateRange)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={1}
                    initialFocus
                    className="rounded-lg border shadow-sm"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <Button
                variant="ghost"
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Resultados ({pagination.total} convocac
              {pagination.total === 1 ? "ao" : "oes"})
            </CardTitle>
            {pagination.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Página {pagination.page} de {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                  disabled={page === pagination.totalPages}
                >
                  Próxima
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <Button variant="outline" onClick={fetchCampaigns} className="mt-4">
                Tentar Novamente
              </Button>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                Nenhuma convocacao encontrada
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Contatos</TableHead>
                  <TableHead className="text-right">Progresso</TableHead>
                  <TableHead className="text-right">Enviados</TableHead>
                  <TableHead className="text-right">Entregues</TableHead>
                  <TableHead className="text-right">Lidos</TableHead>
                  <TableHead className="text-right">Falhas</TableHead>
                  <TableHead className="text-right">Criado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => {
                  const statusConfig = CAMPAIGN_STATUS_CONFIG[campaign.status];
                  return (
                    <TableRow
                      key={campaign.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <TableCell className="font-medium dark:text-gray-200">
                        {campaign.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="default" className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {campaign.totalContacts}
                      </TableCell>
                      <TableCell className="text-right">
                        {calculateProgress(campaign)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {campaign.sentCount}
                      </TableCell>
                      <TableCell className="text-right text-green-600 dark:text-green-400">
                        {campaign.deliveredCount}
                      </TableCell>
                      <TableCell className="text-right text-blue-600 dark:text-blue-400">
                        {campaign.readCount}
                      </TableCell>
                      <TableCell className="text-right text-red-600 dark:text-red-400">
                        {campaign.failedCount}
                      </TableCell>
                      <TableCell className="text-right text-gray-500 dark:text-gray-400">
                        {formatDateTime(campaign.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <CampaignActions
                          campaign={campaign}
                          onActionComplete={fetchCampaigns}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
