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
 * REFACTORED: Business logic moved to n8n workflow
 * API Route responsibilities:
 * 1. Validate campaign exists and is PAUSED
 * 2. Set cancel flag (status = CANCELLED) to signal n8n
 * 3. Return success response
 *
 * n8n workflow responsibilities (business logic):
 * - Detect cancel flag (if workflow is still running)
 * - Stop processing immediately
 * - Mark all QUEUED/PENDING messages as CANCELLED or FAILED
 * - Clean up resources
 * - Log cancellation
 *
 * Note: Cancellation is more aggressive than pause - no waiting for in-flight messages
 * Database flag approach: Campaign status acts as coordination flag
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Validate campaign exists
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

    // Set cancel flag (n8n will detect this if workflow is still active)
    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        status: CampaignStatus.CANCELLED,
      },
    });

    // Note: Message cleanup is now handled by n8n workflow or left as-is
    // Since campaign is PAUSED, there's no active workflow to signal
    // Messages remain in their current state (PENDING, QUEUED, SENT, etc.)
    // n8n can optionally clean up messages if needed

    return NextResponse.json({
      success: true,
      data: {
        id: updatedCampaign.id,
        name: updatedCampaign.name,
        status: updatedCampaign.status,
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
