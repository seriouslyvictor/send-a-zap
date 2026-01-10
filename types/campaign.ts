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

/** Status display configuration */
export const CAMPAIGN_STATUS_CONFIG: Record<
  CampaignStatusType,
  { color: string; label: string }
> = {
  DRAFT: { color: "bg-gray-500", label: "Rascunho" },
  PENDING: { color: "bg-yellow-500", label: "Pendente" },
  RUNNING: { color: "bg-blue-500", label: "Em Execucao" },
  PAUSED: { color: "bg-orange-500", label: "Pausado" },
  COMPLETED: { color: "bg-green-500", label: "Concluido" },
  CANCELLED: { color: "bg-gray-500", label: "Cancelado" },
  FAILED: { color: "bg-red-500", label: "Falhou" },
};
