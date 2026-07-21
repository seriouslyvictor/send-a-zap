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
 * This route only flips Campaign.status to PAUSED — it makes no network
 * call to the runner. The in-app BullMQ runner's next tick claims the
 * campaign via the executor, observes the PAUSED status, and ends the tick
 * chain on its own, so no extra coordination is needed here.
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

    // Set pause flag (the runner's next tick will detect this and stop)
    const updatedCampaign = await getPrisma().campaign.update({
      where: { id },
      data: {
        status: CampaignStatus.PAUSED,
      },
    });

    // Note: QUEUED messages are reverted to PENDING by the runner executor's
    // initialize step the next time this campaign is started or resumed.

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
