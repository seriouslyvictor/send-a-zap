/**
 * Campaign Pause API Route
 *
 * POST /api/campaigns/[id]/pause - Pause a running campaign
 */

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { CampaignStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/campaigns/[id]/pause
 * Pause a running campaign
 *
 * REFACTORED: Business logic moved to n8n workflow
 * API Route responsibilities:
 * 1. Validate campaign exists and is RUNNING
 * 2. Set pause flag (status = PAUSED) to signal n8n
 * 3. Return success response
 *
 * n8n workflow responsibilities (business logic):
 * - Detect pause flag (check campaign.status before each batch)
 * - Stop processing new messages
 * - Wait for in-flight messages to complete
 * - Revert QUEUED messages back to PENDING
 * - Confirm pause completion
 *
 * Database flag approach: Campaign status acts as coordination flag
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Validate campaign exists
    const campaign = await getPrisma().campaign.findUnique({
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

    // Set pause flag (n8n will detect this and handle cleanup)
    const updatedCampaign = await getPrisma().campaign.update({
      where: { id },
      data: {
        status: CampaignStatus.PAUSED,
      },
    });

    // Note: Message state reversal is now handled by n8n workflow
    // The workflow checks campaign.status before each batch and stops processing
    // when it detects PAUSED status, then reverts QUEUED messages to PENDING

    return NextResponse.json({
      success: true,
      data: {
        id: updatedCampaign.id,
        name: updatedCampaign.name,
        status: updatedCampaign.status,
      },
      message: "Pause signal sent. Campaign will stop after current batch completes.",
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
