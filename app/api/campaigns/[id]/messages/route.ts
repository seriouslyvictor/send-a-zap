/**
 * Campaign Messages API Route
 *
 * GET /api/campaigns/[id]/messages - Get messages for a campaign
 */

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/campaigns/[id]/messages
 * Get messages for a specific campaign
 */
export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);

    // Validate and sanitize inputs
    const validLimit = Math.min(500, Math.max(1, limit));
    const validPage = Math.max(1, page);
    const skip = (validPage - 1) * validLimit;

    // Build where clause
    const where: { campaignId: string; status?: string } = { campaignId: id };
    if (status) {
      where.status = status;
    }

    // Fetch messages
    const [messages, totalCount] = await Promise.all([
      getPrisma().message.findMany({
        where,
        select: {
          id: true,
          phone: true,
          name: true,
          status: true,
          sentAt: true,
          deliveredAt: true,
          readAt: true,
          errorMessage: true,
          createdAt: true,
        },
        orderBy: [
          { status: "asc" }, // Show failed/pending first
          { createdAt: "desc" }, // Then by creation time
        ],
        take: validLimit,
        skip,
      }),
      getPrisma().message.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: messages,
      pagination: {
        page: validPage,
        limit: validLimit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / validLimit),
      },
    });
  } catch (error) {
    console.error("[CAMPAIGN_MESSAGES] Error fetching messages:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch messages",
      },
      { status: 500 }
    );
  }
}
