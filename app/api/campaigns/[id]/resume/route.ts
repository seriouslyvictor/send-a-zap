/**
 * Campaign Resume API Route
 *
 * POST /api/campaigns/[id]/resume - Resume a paused campaign
 */

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { CampaignStatus, MessageStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/campaigns/[id]/resume
 * Resume a paused campaign by triggering the n8n workflow again
 *
 * REFACTORED: Business logic moved to n8n workflow
 * API Route responsibilities:
 * 1. Validate campaign exists and is PAUSED
 * 2. Validate pending messages exist
 * 3. Trigger n8n workflow
 * 4. Return success response
 *
 * n8n workflow responsibilities (business logic):
 * - Check if pending messages exist (if none, mark COMPLETED)
 * - Update campaign status to RUNNING
 * - Update messages from PENDING to QUEUED
 * - Process messages (send via Evolution API)
 * - Handle completion and errors
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Validate campaign exists
    const campaign = await getPrisma().campaign.findUnique({
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

    // Check for pending messages (informational only, n8n will handle completion logic)
    const pendingCount = await getPrisma().message.count({
      where: {
        campaignId: id,
        status: MessageStatus.PENDING,
      },
    });

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

      // n8n webhook may return JSON, HTML, or empty response - we don't need to parse it
      // The workflow runs asynchronously and updates the database itself
      console.log(`[CAMPAIGN] n8n workflow triggered successfully, status: ${n8nResponse.status}`);

      // Read updated campaign state (n8n has already updated it)
      const updatedCampaign = await getPrisma().campaign.findUnique({
        where: { id },
      });

      return NextResponse.json({
        success: true,
        data: {
          id: updatedCampaign!.id,
          name: updatedCampaign!.name,
          status: updatedCampaign!.status,
          n8nExecutionId: updatedCampaign!.n8nExecutionId,
          pendingMessages: pendingCount,
        },
        message: "Campaign resumed successfully",
      });
    } catch (error) {
      console.error("[CAMPAIGN] Failed to trigger n8n workflow for resume:", error);

      return NextResponse.json(
        {
          success: false,
          error: `Failed to trigger n8n workflow: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
        { status: 500 }
      );
    }
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
