"use client";

import { useState } from "react";
import {
  ChevronRight,
  Eye,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Loader2,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Campaign, CampaignStatusType } from "@/types/campaign";

interface CampaignActionsProps {
  campaign: Campaign;
  onActionComplete?: () => void;
}

interface ActionConfig {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  variant?: "default" | "destructive";
  showSeparatorAfter?: boolean;
  isEnabled: (status: CampaignStatusType) => boolean;
  disabledReason: (status: CampaignStatusType) => string;
  action: (campaign: Campaign) => Promise<void>;
}

async function postCampaignAction(
  campaignId: string,
  action: string,
  errorMessage: string
): Promise<void> {
  const response = await fetch(`/api/campaigns/${campaignId}/${action}`, {
    method: "POST",
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || errorMessage);
  }
}

function getStartDisabledReason(status: CampaignStatusType): string {
  switch (status) {
    case "RUNNING": return "Convocacao ja esta em execucao";
    case "PAUSED": return "Use 'Continuar' para retomar";
    case "COMPLETED": return "Convocacao ja foi concluida";
    case "CANCELLED": return "Convocacao foi cancelada";
    default: return "Nao e possivel iniciar neste status";
  }
}

function getPauseDisabledReason(status: CampaignStatusType): string {
  switch (status) {
    case "DRAFT": return "Convocacao ainda nao foi iniciada";
    case "PAUSED": return "Convocacao ja esta pausada";
    case "COMPLETED": return "Convocacao ja foi concluida";
    case "CANCELLED": return "Convocacao foi cancelada";
    case "FAILED": return "Convocacao falhou";
    default: return "Nao e possivel pausar neste status";
  }
}

function getResumeDisabledReason(status: CampaignStatusType): string {
  switch (status) {
    case "DRAFT": return "Use 'Iniciar' para comecar";
    case "RUNNING": return "Convocacao ja esta em execucao";
    case "COMPLETED": return "Convocacao ja foi concluida";
    case "CANCELLED": return "Convocacao foi cancelada";
    case "FAILED": return "Use 'Iniciar' para tentar novamente";
    default: return "Nao e possivel continuar neste status";
  }
}

function getCancelDisabledReason(status: CampaignStatusType): string {
  switch (status) {
    case "DRAFT": return "Use 'Excluir' para remover rascunhos";
    case "RUNNING": return "Pause a convocacao antes de cancelar";
    case "COMPLETED": return "Convocacao ja foi concluida";
    case "CANCELLED": return "Convocacao ja esta cancelada";
    case "FAILED": return "Use 'Excluir' para remover convocacoes falhas";
    default: return "Nao e possivel cancelar neste status";
  }
}

function getDeleteDisabledReason(status: CampaignStatusType): string {
  switch (status) {
    case "RUNNING": return "Pause a convocacao antes de excluir";
    case "PAUSED": return "Cancele a convocacao antes de excluir";
    default: return "Nao e possivel excluir neste status";
  }
}

const ACTIONS: ActionConfig[] = [
  {
    id: "details",
    label: "Ver Detalhes",
    description: "Visualizar informacoes completas da convocacao",
    icon: <Eye className="w-4 h-4" />,
    showSeparatorAfter: true,
    isEnabled: () => true,
    disabledReason: () => "",
    action: async (campaign) => {
      // TODO: Navigate to details page or open modal
      console.log("View details:", campaign.id);
    },
  },
  {
    id: "start",
    label: "Iniciar",
    description: "Iniciar o envio de mensagens",
    icon: <Play className="w-4 h-4" />,
    isEnabled: (status) => status === "DRAFT" || status === "FAILED",
    disabledReason: getStartDisabledReason,
    action: (campaign) => postCampaignAction(campaign.id, "start", "Erro ao iniciar convocacao"),
  },
  {
    id: "pause",
    label: "Pausar",
    description: "Pausar o envio de mensagens temporariamente",
    icon: <Pause className="w-4 h-4" />,
    isEnabled: (status) => status === "RUNNING",
    disabledReason: getPauseDisabledReason,
    action: (campaign) => postCampaignAction(campaign.id, "pause", "Erro ao pausar convocacao"),
  },
  {
    id: "resume",
    label: "Continuar",
    description: "Retomar o envio de mensagens pausado",
    icon: <RotateCcw className="w-4 h-4" />,
    isEnabled: (status) => status === "PAUSED",
    disabledReason: getResumeDisabledReason,
    action: (campaign) => postCampaignAction(campaign.id, "resume", "Erro ao continuar convocacao"),
  },
  {
    id: "cancel",
    label: "Cancelar",
    description: "Cancelar permanentemente a convocacao pausada",
    icon: <XCircle className="w-4 h-4" />,
    variant: "destructive",
    showSeparatorAfter: true,
    isEnabled: (status) => status === "PAUSED",
    disabledReason: getCancelDisabledReason,
    action: async (campaign) => {
      const confirmed = confirm(
        `Tem certeza que deseja cancelar a convocacao "${campaign.name}"? Esta acao nao pode ser desfeita.`
      );
      if (!confirmed) return;

      await postCampaignAction(campaign.id, "cancel", "Erro ao cancelar convocacao");
    },
  },
  {
    id: "delete",
    label: "Excluir Convocacao",
    description: "Remover permanentemente a convocacao",
    icon: <Trash2 className="w-4 h-4" />,
    variant: "destructive",
    isEnabled: (status) =>
      status === "DRAFT" ||
      status === "COMPLETED" ||
      status === "CANCELLED" ||
      status === "FAILED",
    disabledReason: getDeleteDisabledReason,
    action: async (campaign) => {
      const confirmed = confirm(
        `Tem certeza que deseja excluir a convocacao "${campaign.name}"? Esta acao nao pode ser desfeita.`
      );
      if (!confirmed) return;

      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Erro ao excluir convocacao");
      }
    },
  },
];

export function CampaignActions({
  campaign,
  onActionComplete,
}: CampaignActionsProps): React.ReactElement {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  async function handleAction(
    actionFn: (campaign: Campaign) => Promise<void>,
    actionId: string
  ): Promise<void> {
    try {
      setIsLoading(true);
      setLoadingAction(actionId);
      await actionFn(campaign);
      onActionComplete?.();
    } catch (error) {
      console.error("Action error:", error);
      alert(error instanceof Error ? error.message : "Erro ao executar acao");
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  }

  function renderMenuItem(actionConfig: ActionConfig): React.ReactElement {
    const isEnabled = actionConfig.isEnabled(campaign.status);
    const disabledReason = actionConfig.disabledReason(campaign.status);
    const isActionLoading = loadingAction === actionConfig.id;

    const menuItem = (
      <DropdownMenuItem
        disabled={!isEnabled || isLoading}
        onSelect={() => handleAction(actionConfig.action, actionConfig.id)}
        className={
          actionConfig.variant === "destructive"
            ? "text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
            : ""
        }
      >
        <div className="flex items-start gap-3 w-full">
          <div className="mt-0.5">
            {isActionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              actionConfig.icon
            )}
          </div>
          <div className="flex-1 space-y-1">
            <div className="font-medium">{actionConfig.label}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {actionConfig.description}
            </div>
          </div>
        </div>
      </DropdownMenuItem>
    );

    if (!isEnabled && disabledReason) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div>{menuItem}</div>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[200px] text-sm">
            {disabledReason}
          </TooltipContent>
        </Tooltip>
      );
    }

    return menuItem;
  }

  return (
    <TooltipProvider>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default" size="sm" disabled={isLoading} className="gap-1">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Acoes
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[280px]">
          {ACTIONS.map((actionConfig) => (
            <div key={actionConfig.id}>
              {renderMenuItem(actionConfig)}
              {actionConfig.showSeparatorAfter && <DropdownMenuSeparator />}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
