/**
 * Campaign Resume API Route
 *
 * POST /api/campaigns/[id]/resume - Resume a paused campaign
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CampaignStatus, MessageStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/campaigns/[id]/resume
 * Resume a paused campaign by triggering the n8n workflow again
 *
 * Flow:
 * 1. Validate campaign is PAUSED
 * 2. Check for remaining PENDING messages
 * 3. Update campaign status to RUNNING (BEFORE calling n8n)
 * 4. Update messages from PENDING to QUEUED
 * 5. Trigger n8n workflow
 * 6. If n8n fails, rollback status to PAUSED and messages to PENDING
 * 7. Store execution ID and return success
 *
 * CRITICAL: DB must be updated BEFORE triggering n8n, not after.
 * The n8n workflow checks for status == RUNNING immediately.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Fetch campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Can only resume PAUSED campaigns
    if (campaign.status !== CampaignStatus.PAUSED) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot resume campaign with status ${campaign.status}. Only PAUSED campaigns can be resumed.`,
        },
        { status: 400 }
      );
    }

    // Check for pending messages
    const pendingCount = await prisma.message.count({
      where: {
        campaignId: id,
        status: MessageStatus.PENDING,
      },
    });

    if (pendingCount === 0) {
      // No pending messages - mark as completed
      await prisma.campaign.update({
        where: { id },
        data: {
          status: CampaignStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Campaign has no pending messages and was marked as completed",
        data: {
          id: campaign.id,
          name: campaign.name,
          status: CampaignStatus.COMPLETED,
        },
      });
    }

    // Get n8n webhook URL from environment
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

    if (!n8nWebhookUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "N8N_WEBHOOK_URL is not configured",
        },
        { status: 500 }
      );
    }

    // CRITICAL: Update campaign status to RUNNING *BEFORE* triggering n8n
    // n8n workflow checks for RUNNING status immediately, so DB must be updated first
    await prisma.campaign.update({
      where: { id },
      data: {
        status: CampaignStatus.RUNNING,
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

    // Trigger n8n workflow
    let n8nExecutionId: string | undefined;

    try {
      const webhookUrl = `${n8nWebhookUrl}/campaign-executor`;
      console.log(`[CAMPAIGN] Resuming - triggering n8n webhook: ${webhookUrl}`);

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
          resuming: true, // Flag to indicate this is a resume operation
        }),
      });

      if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text();
        throw new Error(`n8n webhook failed: ${n8nResponse.status} - ${errorText}`);
      }

      const n8nData = await n8nResponse.json();
      n8nExecutionId = n8nData.executionId;

      console.log(`[CAMPAIGN] n8n workflow resumed, executionId: ${n8nExecutionId}`);
    } catch (error) {
      console.error("[CAMPAIGN] Failed to trigger n8n workflow for resume:", error);

      // Rollback campaign status to PAUSED and messages back to PENDING
      await prisma.campaign.update({
        where: { id },
        data: {
          status: CampaignStatus.PAUSED,
        },
      });

      await prisma.message.updateMany({
        where: {
          campaignId: id,
          status: MessageStatus.QUEUED,
        },
        data: {
          status: MessageStatus.PENDING,
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

    // Store n8n execution ID
    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        n8nExecutionId: n8nExecutionId || campaign.n8nExecutionId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedCampaign.id,
        name: updatedCampaign.name,
        status: updatedCampaign.status,
        n8nExecutionId: updatedCampaign.n8nExecutionId,
        pendingMessages: pendingCount,
      },
      message: "Campaign resumed successfully",
    });
  } catch (error) {
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
