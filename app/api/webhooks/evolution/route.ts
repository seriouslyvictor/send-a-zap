/**
 * Evolution API Webhook Receiver
 *
 * POST /api/webhooks/evolution - Receive message status updates from Evolution API
 *
 * Handles events:
 * - messages.upsert - Message sent confirmation
 * - messages.update - Delivery and read receipts
 * - send.message - Message sent (alternative event)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MessageStatus, CampaignStatus } from "@prisma/client";

/**
 * Evolution API webhook event types
 */
type EvolutionEvent =
  | "messages.upsert"
  | "messages.update"
  | "send.message"
  | "message.ack"
  | "connection.update"
  | "qrcode.updated"
  | string;

/**
 * Message acknowledgement status from Evolution API
 */
enum MessageAck {
  ERROR = -1,
  PENDING = 0,
  SERVER = 1,
  DEVICE = 2,
  READ = 3,
  PLAYED = 4, // For voice messages
}

/**
 * Evolution API webhook payload structure
 */
interface EvolutionWebhookPayload {
  event: EvolutionEvent;
  instance: string;
  data: {
    key?: {
      remoteJid?: string;
      fromMe?: boolean;
      id?: string;
    };
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text?: string;
      };
    };
    messageTimestamp?: number;
    status?: string;
    pushName?: string;
    // For message.ack / messages.update
    update?: {
      status?: string;
    };
    // Message ID variations
    id?: string;
    messageId?: string;
    // Acknowledgement status
    ack?: number;
    // Error info
    error?: string;
  };
  destination?: string;
  date_time?: string;
  sender?: string;
  server_url?: string;
  apikey?: string;
}

/**
 * Map Evolution ACK status to our MessageStatus
 */
function ackToMessageStatus(ack: number): MessageStatus | null {
  switch (ack) {
    case MessageAck.ERROR:
      return MessageStatus.FAILED;
    case MessageAck.PENDING:
    case MessageAck.SERVER:
      return MessageStatus.SENT;
    case MessageAck.DEVICE:
      return MessageStatus.DELIVERED;
    case MessageAck.READ:
    case MessageAck.PLAYED:
      return MessageStatus.READ;
    default:
      return null;
  }
}

/**
 * POST /api/webhooks/evolution
 * Process webhook events from Evolution API
 */
export async function POST(request: NextRequest) {
  try {
    // Parse webhook payload
    const payload: EvolutionWebhookPayload = await request.json();

    console.log(`[WEBHOOK] Received event: ${payload.event}`, {
      instance: payload.instance,
      hasData: !!payload.data,
    });

    // Handle different event types
    switch (payload.event) {
      case "messages.upsert":
        return handleMessageUpsert(payload);

      case "messages.update":
      case "message.ack":
        return handleMessageUpdate(payload);

      case "send.message":
        return handleSendMessage(payload);

      case "connection.update":
        // Log connection status changes but don't process
        console.log(`[WEBHOOK] Connection update for ${payload.instance}:`, payload.data);
        return NextResponse.json({ success: true, message: "Connection update logged" });

      default:
        // Log unknown events for debugging
        console.log(`[WEBHOOK] Unhandled event type: ${payload.event}`);
        return NextResponse.json({
          success: true,
          message: `Event type ${payload.event} not processed`,
        });
    }
  } catch (error) {
    console.error("[WEBHOOK] Error processing webhook:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process webhook",
      },
      { status: 500 }
    );
  }
}

/**
 * Handle messages.upsert event (new message sent or received)
 * This is called when a message is initially sent
 */
async function handleMessageUpsert(payload: EvolutionWebhookPayload) {
  const { data } = payload;

  // Only process messages we sent (fromMe: true)
  if (!data.key?.fromMe) {
    return NextResponse.json({
      success: true,
      message: "Incoming message ignored (not from us)",
    });
  }

  const messageId = data.key.id;

  if (!messageId) {
    console.log("[WEBHOOK] No message ID in upsert event");
    return NextResponse.json({
      success: true,
      message: "No message ID in payload",
    });
  }

  // Find the message by Evolution message ID
  const message = await prisma.message.findFirst({
    where: { messageId },
    include: { campaign: true },
  });

  if (!message) {
    // Message might not be from a campaign
    console.log(`[WEBHOOK] Message ${messageId} not found in database`);
    return NextResponse.json({
      success: true,
      message: "Message not found in database (might not be from a campaign)",
    });
  }

  // Update message status to SENT
  await prisma.message.update({
    where: { id: message.id },
    data: {
      status: MessageStatus.SENT,
      sentAt: new Date(),
    },
  });

  // Update campaign sent count
  await prisma.campaign.update({
    where: { id: message.campaignId },
    data: {
      sentCount: { increment: 1 },
    },
  });

  console.log(`[WEBHOOK] Message ${messageId} marked as SENT`);

  return NextResponse.json({
    success: true,
    message: "Message status updated to SENT",
    data: { messageId, status: MessageStatus.SENT },
  });
}

/**
 * Handle messages.update / message.ack event (delivery/read receipt)
 */
async function handleMessageUpdate(payload: EvolutionWebhookPayload) {
  const { data } = payload;

  // Get message ID from various possible locations
  const messageId = data.key?.id || data.id || data.messageId;

  if (!messageId) {
    console.log("[WEBHOOK] No message ID in update event");
    return NextResponse.json({
      success: true,
      message: "No message ID in payload",
    });
  }

  // Find the message
  const message = await prisma.message.findFirst({
    where: { messageId },
    include: { campaign: true },
  });

  if (!message) {
    console.log(`[WEBHOOK] Message ${messageId} not found in database`);
    return NextResponse.json({
      success: true,
      message: "Message not found in database",
    });
  }

  // Determine new status from ACK
  const ack = data.ack;
  if (ack === undefined) {
    console.log("[WEBHOOK] No ACK status in update event");
    return NextResponse.json({
      success: true,
      message: "No ACK status in payload",
    });
  }

  const newStatus = ackToMessageStatus(ack);
  if (!newStatus) {
    console.log(`[WEBHOOK] Unknown ACK status: ${ack}`);
    return NextResponse.json({
      success: true,
      message: `Unknown ACK status: ${ack}`,
    });
  }

  // Only update if status is progressing (don't go backwards)
  const statusOrder = {
    [MessageStatus.PENDING]: 0,
    [MessageStatus.QUEUED]: 1,
    [MessageStatus.SENT]: 2,
    [MessageStatus.DELIVERED]: 3,
    [MessageStatus.READ]: 4,
    [MessageStatus.FAILED]: -1, // Failed can happen at any point
  };

  const currentOrder = statusOrder[message.status];
  const newOrder = statusOrder[newStatus];

  // Skip if trying to go backwards (unless it's FAILED)
  if (newStatus !== MessageStatus.FAILED && newOrder <= currentOrder) {
    console.log(
      `[WEBHOOK] Skipping status update: ${message.status} -> ${newStatus} (not progressing)`
    );
    return NextResponse.json({
      success: true,
      message: `Status not updated (current: ${message.status}, new: ${newStatus})`,
    });
  }

  // Prepare update data
  const updateData: any = { status: newStatus };
  const campaignUpdate: any = {};

  // Add timestamps based on new status
  switch (newStatus) {
    case MessageStatus.SENT:
      if (!message.sentAt) updateData.sentAt = new Date();
      if (message.status !== MessageStatus.SENT) campaignUpdate.sentCount = { increment: 1 };
      break;
    case MessageStatus.DELIVERED:
      if (!message.deliveredAt) updateData.deliveredAt = new Date();
      campaignUpdate.deliveredCount = { increment: 1 };
      break;
    case MessageStatus.READ:
      if (!message.readAt) updateData.readAt = new Date();
      campaignUpdate.readCount = { increment: 1 };
      break;
    case MessageStatus.FAILED:
      updateData.errorMessage = data.error || "Message delivery failed";
      campaignUpdate.failedCount = { increment: 1 };
      break;
  }

  // Update message
  await prisma.message.update({
    where: { id: message.id },
    data: updateData,
  });

  // Update campaign counters
  if (Object.keys(campaignUpdate).length > 0) {
    await prisma.campaign.update({
      where: { id: message.campaignId },
      data: campaignUpdate,
    });
  }

  console.log(`[WEBHOOK] Message ${messageId} updated: ${message.status} -> ${newStatus}`);

  // Check if campaign is complete
  await checkCampaignCompletion(message.campaignId);

  return NextResponse.json({
    success: true,
    message: `Message status updated to ${newStatus}`,
    data: { messageId, status: newStatus },
  });
}

/**
 * Handle send.message event (alternative message sent event)
 */
async function handleSendMessage(payload: EvolutionWebhookPayload) {
  const { data } = payload;

  // Get message ID
  const messageId = data.key?.id || data.id || data.messageId;

  if (!messageId) {
    console.log("[WEBHOOK] No message ID in send.message event");
    return NextResponse.json({
      success: true,
      message: "No message ID in payload",
    });
  }

  // Find and update message
  const message = await prisma.message.findFirst({
    where: { messageId },
  });

  if (!message) {
    console.log(`[WEBHOOK] Message ${messageId} not found in database`);
    return NextResponse.json({
      success: true,
      message: "Message not found in database",
    });
  }

  // Update to SENT if not already
  if (message.status === MessageStatus.QUEUED || message.status === MessageStatus.PENDING) {
    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: MessageStatus.SENT,
        sentAt: new Date(),
      },
    });

    await prisma.campaign.update({
      where: { id: message.campaignId },
      data: {
        sentCount: { increment: 1 },
      },
    });

    console.log(`[WEBHOOK] Message ${messageId} marked as SENT (send.message event)`);
  }

  return NextResponse.json({
    success: true,
    message: "send.message event processed",
    data: { messageId },
  });
}

/**
 * Check if a campaign is complete (all messages processed)
 */
async function checkCampaignCompletion(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      _count: {
        select: { messages: true },
      },
    },
  });

  if (!campaign || campaign.status !== CampaignStatus.RUNNING) {
    return;
  }

  // Count remaining pending/queued messages
  const pendingCount = await prisma.message.count({
    where: {
      campaignId,
      status: { in: [MessageStatus.PENDING, MessageStatus.QUEUED] },
    },
  });

  // If no more pending messages, mark campaign as completed
  if (pendingCount === 0) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    console.log(`[WEBHOOK] Campaign ${campaignId} marked as COMPLETED`);
  }
}

/**
 * GET /api/webhooks/evolution
 * Health check endpoint for webhook configuration
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Evolution webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
