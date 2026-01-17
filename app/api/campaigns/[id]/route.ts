/**
 * Campaign Detail API Routes
 *
 * GET    /api/campaigns/[id] - Get campaign details with messages
 * DELETE /api/campaigns/[id] - Delete a campaign
 */

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { CampaignStatus, MessageStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/campaigns/[id]
 * Get campaign details with optional message inclusion
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeMessages = searchParams.get("includeMessages") === "true";
    const messageStatus = searchParams.get("messageStatus");
    const messagePage = parseInt(searchParams.get("messagePage") || "1", 10);
    const messageLimit = parseInt(searchParams.get("messageLimit") || "50", 10);

    // Validate pagination
    const validPage = Math.max(1, messagePage);
    const validLimit = Math.min(100, Math.max(1, messageLimit));
    const skip = (validPage - 1) * validLimit;

    // Fetch campaign
    const campaign = await getPrisma().campaign.findUnique({
      where: { id },
      include: includeMessages
        ? {
            messages: {
              where:
                messageStatus && Object.values(MessageStatus).includes(messageStatus as MessageStatus)
                  ? { status: messageStatus as MessageStatus }
                  : undefined,
              orderBy: { createdAt: "asc" },
              skip,
              take: validLimit,
            },
            _count: {
              select: { messages: true },
            },
          }
        : {
            _count: {
              select: { messages: true },
            },
          },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Calculate message stats by status
    const messageStats = await getPrisma().message.groupBy({
      by: ["status"],
      where: { campaignId: id },
      _count: { status: true },
    });

    const statsByStatus = messageStats.reduce(
      (acc, stat) => {
        acc[stat.status] = stat._count.status;
        return acc;
      },
      {} as Record<string, number>
    );

    // Calculate progress percentage
    const totalMessages = campaign._count.messages;
    const processedMessages =
      (statsByStatus.SENT || 0) +
      (statsByStatus.DELIVERED || 0) +
      (statsByStatus.READ || 0) +
      (statsByStatus.FAILED || 0);
    const progressPercent =
      totalMessages > 0 ? Math.round((processedMessages / totalMessages) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        ...campaign,
        messageStats: statsByStatus,
        progress: {
          percent: progressPercent,
          processed: processedMessages,
          total: totalMessages,
        },
      },
      ...(includeMessages && {
        pagination: {
          page: validPage,
          limit: validLimit,
          total: totalMessages,
          totalPages: Math.ceil(totalMessages / validLimit),
        },
      }),
    });
  } catch (error) {
    console.error("[CAMPAIGN] Error fetching campaign:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch campaign",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/campaigns/[id]
 * Delete a campaign and all its messages
 *
 * Note: Only allows deletion of DRAFT, COMPLETED, CANCELLED, or FAILED campaigns
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Fetch campaign to check status
    const campaign = await getPrisma().campaign.findUnique({
      where: { id },
      select: { id: true, status: true, name: true },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Prevent deletion of active campaigns
    const activeStatuses: CampaignStatus[] = [
      CampaignStatus.PENDING,
      CampaignStatus.RUNNING,
      CampaignStatus.PAUSED,
    ];

    if (activeStatuses.includes(campaign.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete campaign with status ${campaign.status}. Cancel or complete the campaign first.`,
        },
        { status: 400 }
      );
    }

    // Delete campaign (messages cascade due to onDelete: Cascade)
    await getPrisma().campaign.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Campaign "${campaign.name}" deleted successfully`,
    });
  } catch (error) {
    console.error("[CAMPAIGN] Error deleting campaign:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete campaign",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/campaigns/[id]
 * Update campaign settings (only for DRAFT campaigns)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Fetch campaign to check status
    const campaign = await getPrisma().campaign.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Only allow editing DRAFT campaigns
    if (campaign.status !== CampaignStatus.DRAFT) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot edit campaign with status ${campaign.status}. Only DRAFT campaigns can be edited.`,
        },
        { status: 400 }
      );
    }

    // Allowed fields to update
    const allowedFields = [
      "name",
      "messageTemplate",
      "imageUrl",
      "batchSize",
      "messageDelay",
      "batchDelay",
      "autoRetry",
      "maxRetries",
      "retryDelay",
      "instanceName",
    ];

    const updateData: Record<string, string | number | boolean> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updatedCampaign = await getPrisma().campaign.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedCampaign,
    });
  } catch (error) {
    console.error("[CAMPAIGN] Error updating campaign:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update campaign",
      },
      { status: 500 }
    );
  }
}
