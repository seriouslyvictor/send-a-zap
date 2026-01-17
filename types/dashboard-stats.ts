/**
 * Dashboard Statistics Types
 */

export interface ComparisonData {
  yesterdayTotal: number;
  changePercent: number;
  trend: "up" | "down" | "neutral";
}

export interface StatData {
  label: string;
  total: number;
  rate: number;
}

export interface DashboardStats {
  sent: StatData;
  delivered: StatData;
  read: StatData;
  failed: StatData;
  comparison: ComparisonData | null;
}

export interface StatCard {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  trend: "up" | "down" | "neutral";
}

export interface SelectedCampaignDetails {
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
  failedMessages: unknown[];
}
