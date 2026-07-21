/**
 * Campaign Cancel API Route
 *
 * POST /api/campaigns/[id]/cancel - Cancel a paused campaign
 */

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { CampaignStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/campaigns/[id]/cancel
 * Cancel a paused campaign
 *
 * This route only flips Campaign.status to CANCELLED — it makes no network
 * call to the runner. Since the campaign is already PAUSED there is no
 * active tick chain to signal; if the campaign is later started again, the
 * runner executor's initialize step will reconcile message state.
 *
 * Database flag approach: Campaign status acts as the coordination flag
 * between this route and the runner.
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

    // Set cancel flag. The campaign is already PAUSED, so there's no
    // in-flight tick chain to signal.
    const updatedCampaign = await getPrisma().campaign.update({
      where: { id },
      data: {
        status: CampaignStatus.CANCELLED,
      },
    });

    // Note: Messages remain in their current state (PENDING, QUEUED, SENT,
    // etc.). QUEUED messages are reconciled back to PENDING by the runner
    // executor's initialize step if this campaign is ever restarted.

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
