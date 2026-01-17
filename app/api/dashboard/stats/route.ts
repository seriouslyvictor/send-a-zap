/**
 * Dashboard Statistics API Route
 *
 * GET /api/dashboard/stats - Get dashboard statistics
 */

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

/**
 * GET /api/dashboard/stats
 * Get aggregated statistics for the dashboard
 */
type Period = "today" | "week" | "month" | "all";

interface ComparisonData {
  yesterdayTotal: number;
  changePercent: number;
  trend: "up" | "down" | "neutral";
}

function getDateFilter(period: Period): { gte: Date } | undefined {
  const now = new Date();

  switch (period) {
    case "today": {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      return { gte: startOfDay };
    }
    case "week": {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);
      return { gte: startOfWeek };
    }
    case "month": {
      const startOfMonth = new Date(now);
      startOfMonth.setDate(now.getDate() - 30);
      return { gte: startOfMonth };
    }
    case "all":
    default:
      return undefined;
  }
}

// Removed getYesterdayComparison - now inlined in GET handler for better parallelization

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "today") as Period;

    const dateFilter = getDateFilter(period);

    // Parallelize: Get today's counts and yesterday's counts simultaneously
    const [messageCounts, yesterdayData] = await Promise.all([
      getPrisma().message.groupBy({
        by: ["status"],
        where: dateFilter ? { sentAt: dateFilter } : undefined,
        _count: {
          status: true,
        },
      }),
      // Fetch yesterday's data in parallel if period is "today"
      period === "today" ? (async () => {
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const startOfYesterday = new Date(yesterday.setHours(0, 0, 0, 0));
        const endOfYesterday = new Date(yesterday.setHours(23, 59, 59, 999));

        return getPrisma().message.groupBy({
          by: ["status"],
          where: {
            sentAt: {
              gte: startOfYesterday,
              lte: endOfYesterday,
            },
          },
          _count: {
            status: true,
          },
        });
      })() : Promise.resolve(null),
    ]);

    // Transform to a more usable format
    const statsByStatus = messageCounts.reduce(
      (acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      },
      {} as Record<string, number>
    );

    // Calculate totals
    const totalSent = (statsByStatus.SENT || 0) +
                      (statsByStatus.DELIVERED || 0) +
                      (statsByStatus.READ || 0) +
                      (statsByStatus.FAILED || 0);
    const totalDelivered = (statsByStatus.DELIVERED || 0) + (statsByStatus.READ || 0);
    const totalRead = statsByStatus.READ || 0;
    const totalFailed = statsByStatus.FAILED || 0;

    // Calculate rates
    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
    const readRate = totalSent > 0 ? Math.round((totalRead / totalSent) * 100) : 0;
    const failureRate = totalSent > 0 ? Math.round((totalFailed / totalSent) * 100) : 0;

    // Calculate comparison from already-fetched yesterday data
    const comparison = yesterdayData ? (() => {
      const yesterdayStats = yesterdayData.reduce(
        (acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        },
        {} as Record<string, number>
      );

      const yesterdayTotal = (yesterdayStats.SENT || 0) +
                             (yesterdayStats.DELIVERED || 0) +
                             (yesterdayStats.READ || 0) +
                             (yesterdayStats.FAILED || 0);

      function calculateChangePercent(today: number, yesterday: number): number {
        if (yesterday > 0) {
          return Math.round(((today - yesterday) / yesterday) * 100);
        }
        return today > 0 ? 100 : 0;
      }

      function getTrend(changePercent: number): "up" | "down" | "neutral" {
        if (changePercent > 0) return "up";
        if (changePercent < 0) return "down";
        return "neutral";
      }

      const changePercent = calculateChangePercent(totalSent, yesterdayTotal);

      return {
        yesterdayTotal,
        changePercent,
        trend: getTrend(changePercent),
      };
    })() : null;

    return NextResponse.json({
      success: true,
      data: {
        period,
        sent: {
          total: totalSent,
          label: period === "today" ? "Enviadas Hoje" : "Total Enviadas",
        },
        delivered: {
          total: totalDelivered,
          rate: deliveryRate,
          label: "Entregues",
        },
        read: {
          total: totalRead,
          rate: readRate,
          label: "Lidas",
        },
        failed: {
          total: totalFailed,
          rate: failureRate,
          label: "Falhadas",
        },
        comparison,
      },
    });
  } catch (error) {
    console.error("[DASHBOARD_STATS] Error fetching stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch stats",
      },
      { status: 500 }
    );
  }
}
