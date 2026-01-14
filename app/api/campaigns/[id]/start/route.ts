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
 * REFACTORED: Business logic moved to n8n workflow
 * API Route responsibilities:
 * 1. Validate campaign exists and is in valid state (DRAFT or FAILED)
 * 2. Validate pending messages exist
 * 3. Trigger n8n workflow
 * 4. Return success response
 *
 * n8n workflow responsibilities (business logic):
 * - Update campaign status to RUNNING
 * - Set startedAt timestamp
 * - Store n8n execution ID
 * - Update messages from PENDING to QUEUED
 * - Process messages (send via Evolution API)
 * - Handle completion and errors
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Validate campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id },
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

    // Trigger n8n workflow (n8n handles ALL state transitions and business logic)
    try {
      const webhookUrl = `${n8nWebhookUrl}/webhook/campaign/start`;
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
      console.log(`[CAMPAIGN] n8n workflow triggered successfully`);

      // Read updated campaign state (n8n has already updated it)
      const updatedCampaign = await prisma.campaign.findUnique({
        where: { id },
      });

      return NextResponse.json({
        success: true,
        data: {
          id: updatedCampaign!.id,
          name: updatedCampaign!.name,
          status: updatedCampaign!.status,
          n8nExecutionId: updatedCampaign!.n8nExecutionId,
          startedAt: updatedCampaign!.startedAt,
          pendingMessages: pendingCount,
        },
        message: "Campaign started successfully",
      });
    } catch (error) {
      console.error("[CAMPAIGN] Failed to trigger n8n workflow:", error);

      return NextResponse.json(
        {
          success: false,
          error: `Failed to trigger n8n workflow: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
        { status: 500 }
      );
    }
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
