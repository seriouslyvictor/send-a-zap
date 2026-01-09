/**
 * Campaign Start API Route
 *
 * POST /api/campaigns/[id]/start - Start a campaign (trigger n8n workflow)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CampaignStatus, MessageStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/campaigns/[id]/start
 * Start a campaign by triggering the n8n workflow
 *
 * Flow:
 * 1. Validate campaign exists and is in valid state (DRAFT or PAUSED)
 * 2. Update campaign status to PENDING
 * 3. Update all PENDING messages to QUEUED
 * 4. Call n8n webhook to trigger campaign-executor workflow
 * 5. Store n8n execution ID
 * 6. Update campaign status to RUNNING
 * 7. Return success
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Fetch campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
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

    // Validate campaign status - can only start from DRAFT or when retrying FAILED
    const allowedStatuses: CampaignStatus[] = [CampaignStatus.DRAFT, CampaignStatus.FAILED];
    if (!allowedStatuses.includes(campaign.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot start campaign with status ${campaign.status}. Only DRAFT or FAILED campaigns can be started.`,
        },
        { status: 400 }
      );
    }

    // Check if there are any pending messages
    const pendingCount = await prisma.message.count({
      where: {
        campaignId: id,
        status: { in: [MessageStatus.PENDING, MessageStatus.FAILED] },
      },
    });

    if (pendingCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No pending messages to send in this campaign",
        },
        { status: 400 }
      );
    }

    // Update campaign status to PENDING first
    await prisma.campaign.update({
      where: { id },
      data: {
        status: CampaignStatus.PENDING,
        startedAt: new Date(),
      },
    });

    // Get n8n webhook URL from environment
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

    if (!n8nWebhookUrl) {
      // Rollback status if n8n is not configured
      await prisma.campaign.update({
        where: { id },
        data: { status: campaign.status },
      });

      return NextResponse.json(
        {
          success: false,
          error: "N8N_WEBHOOK_URL is not configured",
        },
        { status: 500 }
      );
    }

    // Trigger n8n workflow
    let n8nExecutionId: string | undefined;

    try {
      const webhookUrl = `${n8nWebhookUrl}/campaign-executor`;
      console.log(`[CAMPAIGN] Triggering n8n webhook: ${webhookUrl}`);

      const n8nResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignId: id,
          instanceName: campaign.instanceName,
          batchSize: campaign.batchSize,
          messageDelay: campaign.messageDelay,
          batchDelay: campaign.batchDelay,
          autoRetry: campaign.autoRetry,
          maxRetries: campaign.maxRetries,
        }),
      });

      if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text();
        throw new Error(`n8n webhook failed: ${n8nResponse.status} - ${errorText}`);
      }

      const n8nData = await n8nResponse.json();
      n8nExecutionId = n8nData.executionId;

      console.log(`[CAMPAIGN] n8n workflow triggered, executionId: ${n8nExecutionId}`);
    } catch (error) {
      console.error("[CAMPAIGN] Failed to trigger n8n workflow:", error);

      // Rollback campaign status
      await prisma.campaign.update({
        where: { id },
        data: {
          status: CampaignStatus.FAILED,
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: `Failed to trigger n8n workflow: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
        { status: 500 }
      );
    }

    // Update campaign to RUNNING with n8n execution ID
    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        status: CampaignStatus.RUNNING,
        n8nExecutionId: n8nExecutionId,
      },
    });

    // Update pending messages to QUEUED
    await prisma.message.updateMany({
      where: {
        campaignId: id,
        status: MessageStatus.PENDING,
      },
      data: {
        status: MessageStatus.QUEUED,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedCampaign.id,
        name: updatedCampaign.name,
        status: updatedCampaign.status,
        n8nExecutionId: updatedCampaign.n8nExecutionId,
        startedAt: updatedCampaign.startedAt,
        pendingMessages: pendingCount,
      },
      message: "Campaign started successfully",
    });
  } catch (error) {
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
