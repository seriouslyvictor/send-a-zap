/**
 * Campaign Types
 *
 * Shared type definitions for campaign-related data structures.
 * Used by both client components and API routes.
 */

export type CampaignStatusType =
  | "DRAFT"
  | "PENDING"
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED";

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatusType;
  totalContacts: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  _count: {
    messages: number;
  };
}

export interface CampaignListResponse {
  success: boolean;
  data: Campaign[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

/** Status display configuration with light backgrounds and darker text */
export const CAMPAIGN_STATUS_CONFIG: Record<
  CampaignStatusType,
  {
    color: string;
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  DRAFT: {
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    label: "Rascunho",
    variant: "outline"
  },
  PENDING: {
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    label: "Pendente",
    variant: "outline"
  },
  RUNNING: {
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    label: "Em Execução",
    variant: "default"
  },
  PAUSED: {
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    label: "Pausada",
    variant: "outline"
  },
  COMPLETED: {
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    label: "Concluída",
    variant: "secondary"
  },
  CANCELLED: {
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    label: "Cancelada",
    variant: "outline"
  },
  FAILED: {
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    label: "Falhou",
    variant: "destructive"
  },
};
