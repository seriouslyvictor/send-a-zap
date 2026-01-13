/**
 * Campaign Cancel API Route
 *
 * POST /api/campaigns/[id]/cancel - Cancel a paused campaign
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CampaignStatus, MessageStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/campaigns/[id]/cancel
 * Cancel a paused campaign
 *
 * Note: This permanently stops a campaign. The campaign can only be deleted after cancellation.
 * Only PAUSED campaigns can be cancelled.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Fetch campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: { id: true, name: true, status: true },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Can only cancel PAUSED campaigns
    if (campaign.status !== CampaignStatus.PAUSED) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot cancel campaign with status ${campaign.status}. Only PAUSED campaigns can be cancelled.`,
        },
        { status: 400 }
      );
    }

    // Update campaign status to CANCELLED
    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        status: CampaignStatus.CANCELLED,
      },
    });

    // Revert any QUEUED or PENDING messages back to PENDING
    // This ensures message state is clean for potential future operations
    const updatedMessages = await prisma.message.updateMany({
      where: {
        campaignId: id,
        status: { in: [MessageStatus.QUEUED, MessageStatus.PENDING] },
      },
      data: {
        status: MessageStatus.PENDING,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedCampaign.id,
        name: updatedCampaign.name,
        status: updatedCampaign.status,
        messagesReverted: updatedMessages.count,
      },
      message: "Campaign cancelled successfully",
    });
  } catch (error) {
    console.error("[CAMPAIGN] Error cancelling campaign:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to cancel campaign",
      },
      { status: 500 }
    );
  }
}
