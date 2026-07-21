/**
 * Campaign Resume API Route
 *
 * POST /api/campaigns/[id]/resume - Resume a paused campaign
 *
 * Resume shares the same path as start: the runner executor's initialize
 * step permits campaigns in PAUSED status, reverts QUEUED messages back to
 * PENDING, flips the campaign to RUNNING with a fresh runId, and enqueues
 * the first tick for the in-app BullMQ runner to pick up.
 */

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { CampaignExecutionError } from "@/lib/campaign-executor";
import { createDefaultCampaignRunner } from "@/lib/campaign-runner";
import { getCampaignTickQueue } from "@/lib/campaign-queue";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/campaigns/[id]/resume
 * Resume a paused campaign by kicking off the in-app campaign runner
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const runner = createDefaultCampaignRunner(getCampaignTickQueue());
    const { runId } = await runner.start(id);

    const campaign = await getPrisma().campaign.findUnique({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: campaign!.id,
        name: campaign!.name,
        status: campaign!.status,
        runId,
        startedAt: campaign!.startedAt,
      },
      message: "Campaign resumed successfully",
    });
  } catch (error) {
    if (error instanceof CampaignExecutionError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("[CAMPAIGN] Error resuming campaign:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to resume campaign",
      },
      { status: 500 }
    );
  }
}
