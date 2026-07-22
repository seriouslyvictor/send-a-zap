/**
 * Campaign Start API Route
 *
 * POST /api/campaigns/[id]/start - Start a campaign
 *
 * Drives the in-app BullMQ campaign runner: the runner's executor validates
 * campaign state, flips the campaign to RUNNING with a fresh runId, and
 * enqueues the first tick. The worker (see lib/campaign-worker.ts) then
 * processes ticks asynchronously, sending messages via Evolution API.
 */

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { CampaignExecutionError } from "@/lib/campaign-executor";
import { createDefaultCampaignRunner } from "@/lib/campaign-runner";
import { getCampaignTickQueue } from "@/lib/campaign-queue";
import { evaluateSendingCaps, getSendingCaps } from "@/lib/sending-caps";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/campaigns/[id]/start
 * Start a campaign by kicking off the in-app campaign runner
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const prisma = getPrisma();

    const recipientCount = await prisma.message.count({
      where: { campaignId: id },
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const dailySendsSoFar = await prisma.message.count({
      where: {
        createdAt: { gte: startOfToday },
        campaignId: { not: id },
      },
    });

    const decision = evaluateSendingCaps({
      recipientCount,
      dailySendsSoFar,
      caps: getSendingCaps(),
    });

    if (!decision.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: decision.message,
          code: "sending_cap_exceeded",
        },
        { status: 403 },
      );
    }

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
      message: "Campaign started successfully",
    });
  } catch (error) {
    if (error instanceof CampaignExecutionError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("[CAMPAIGN] Error starting campaign:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to start campaign",
      },
      { status: 500 }
    );
  }
}
