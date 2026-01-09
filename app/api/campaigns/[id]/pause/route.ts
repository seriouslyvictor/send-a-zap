/**
 * Campaign Pause API Route
 *
 * POST /api/campaigns/[id]/pause - Pause a running campaign
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CampaignStatus, MessageStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/campaigns/[id]/pause
 * Pause a running campaign
 *
 * Note: This sets the campaign status to PAUSED. The n8n workflow
 * should check campaign status before processing each message batch
 * and stop if PAUSED.
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

    // Can only pause RUNNING or PENDING campaigns
    const pausableStatuses: CampaignStatus[] = [CampaignStatus.RUNNING, CampaignStatus.PENDING];
    if (!pausableStatuses.includes(campaign.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot pause campaign with status ${campaign.status}. Only RUNNING or PENDING campaigns can be paused.`,
        },
        { status: 400 }
      );
    }

    // Update campaign status to PAUSED
    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        status: CampaignStatus.PAUSED,
      },
    });

    // Revert QUEUED messages back to PENDING
    const updatedMessages = await prisma.message.updateMany({
      where: {
        campaignId: id,
        status: MessageStatus.QUEUED,
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
      message: "Campaign paused successfully",
    });
  } catch (error) {
    console.error("[CAMPAIGN] Error pausing campaign:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to pause campaign",
      },
      { status: 500 }
    );
  }
}
