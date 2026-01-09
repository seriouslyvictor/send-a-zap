/**
 * Campaign API Routes
 *
 * GET  /api/campaigns - List all campaigns with pagination
 * POST /api/campaigns - Create a new campaign with messages
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CampaignStatus, MessageStatus } from "@prisma/client";
import { validatePhone, normalizePhone } from "@/lib/phone-validator";
import { renderMessage } from "@/lib/message-renderer";

/**
 * Request body for creating a campaign
 */
interface CreateCampaignRequest {
  name: string;
  messageTemplate: string;
  imageUrl?: string;
  contacts: Array<{
    phone: string;
    name?: string;
    customData?: Record<string, string | number | boolean>;
  }>;
  columnMapping?: Record<string, string>;
  config?: {
    batchSize?: number;
    messageDelay?: number;
    batchDelay?: number;
    autoRetry?: boolean;
    maxRetries?: number;
    retryDelay?: number;
    instanceName?: string;
  };
}

/**
 * GET /api/campaigns
 * List all campaigns with optional pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const status = searchParams.get("status") as CampaignStatus | null;

    // Validate pagination
    const validPage = Math.max(1, page);
    const validLimit = Math.min(100, Math.max(1, limit));
    const skip = (validPage - 1) * validLimit;

    // Build where clause
    const where = status ? { status } : {};

    // Fetch campaigns with counts
    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: validLimit,
        include: {
          _count: {
            select: { messages: true },
          },
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: campaigns,
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        totalPages: Math.ceil(total / validLimit),
      },
    });
  } catch (error) {
    console.error("[CAMPAIGNS] Error listing campaigns:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list campaigns",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/campaigns
 * Create a new campaign with messages
 *
 * Flow:
 * 1. Validate request body
 * 2. Filter contacts against blocklist
 * 3. Render messages (replace placeholders)
 * 4. Create campaign with Prisma
 * 5. Bulk insert messages
 * 6. Return campaignId
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateCampaignRequest = await request.json();

    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Campaign name is required" },
        { status: 400 }
      );
    }

    if (!body.messageTemplate?.trim()) {
      return NextResponse.json(
        { success: false, error: "Message template is required" },
        { status: 400 }
      );
    }

    if (!body.contacts || body.contacts.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one contact is required" },
        { status: 400 }
      );
    }

    // Fetch blocklist for filtering
    const blocklist = await prisma.blocklist.findMany({
      select: { phone: true },
    });
    const blockedPhones = new Set(blocklist.map((b) => b.phone));

    // Process and validate contacts
    const processedContacts: Array<{
      phone: string;
      name?: string;
      customData?: Record<string, string | number | boolean>;
      renderedMessage: string;
      status: "valid" | "invalid" | "blocked";
      error?: string;
    }> = [];

    const validContacts: typeof processedContacts = [];
    const invalidContacts: typeof processedContacts = [];
    const blockedContacts: typeof processedContacts = [];

    for (const contact of body.contacts) {
      // Validate phone number
      const phoneValidation = validatePhone(contact.phone);

      if (!phoneValidation.isValid) {
        invalidContacts.push({
          phone: contact.phone,
          name: contact.name,
          customData: contact.customData,
          renderedMessage: "",
          status: "invalid",
          error: phoneValidation.error,
        });
        continue;
      }

      const normalizedPhone = phoneValidation.normalized;

      // Check blocklist
      if (blockedPhones.has(normalizedPhone)) {
        blockedContacts.push({
          phone: normalizedPhone,
          name: contact.name,
          customData: contact.customData,
          renderedMessage: "",
          status: "blocked",
          error: "Phone is in blocklist",
        });
        continue;
      }

      // Render message with placeholders
      try {
        const messageData = {
          phone: normalizedPhone,
          name: contact.name || "",
          ...(contact.customData || {}),
        };

        const renderedMessage = renderMessage(body.messageTemplate, messageData, {
          fallback: "",
          treatEmptyAsMissing: false,
        });

        validContacts.push({
          phone: normalizedPhone,
          name: contact.name,
          customData: contact.customData,
          renderedMessage,
          status: "valid",
        });
      } catch (error) {
        invalidContacts.push({
          phone: normalizedPhone,
          name: contact.name,
          customData: contact.customData,
          renderedMessage: "",
          status: "invalid",
          error: error instanceof Error ? error.message : "Failed to render message",
        });
      }
    }

    // Check if we have any valid contacts
    if (validContacts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid contacts after validation and blocklist filtering",
          details: {
            total: body.contacts.length,
            invalid: invalidContacts.length,
            blocked: blockedContacts.length,
            invalidContacts: invalidContacts.slice(0, 10), // Show first 10
            blockedContacts: blockedContacts.slice(0, 10),
          },
        },
        { status: 400 }
      );
    }

    // Create campaign with messages in a transaction
    const campaign = await prisma.$transaction(async (tx) => {
      // Create the campaign
      const newCampaign = await tx.campaign.create({
        data: {
          name: body.name.trim(),
          messageTemplate: body.messageTemplate.trim(),
          imageUrl: body.imageUrl,
          status: CampaignStatus.DRAFT,
          totalContacts: validContacts.length,
          columnMapping: body.columnMapping,
          batchSize: body.config?.batchSize ?? 50,
          messageDelay: body.config?.messageDelay ?? 2,
          batchDelay: body.config?.batchDelay ?? 30,
          autoRetry: body.config?.autoRetry ?? false,
          maxRetries: body.config?.maxRetries ?? 3,
          retryDelay: body.config?.retryDelay ?? 5,
          instanceName: body.config?.instanceName ?? "whatsapp-main",
        },
      });

      // Bulk insert messages
      await tx.message.createMany({
        data: validContacts.map((contact) => ({
          campaignId: newCampaign.id,
          phone: contact.phone,
          name: contact.name,
          customData: contact.customData,
          renderedMessage: contact.renderedMessage,
          status: MessageStatus.PENDING,
        })),
      });

      return newCampaign;
    });

    return NextResponse.json({
      success: true,
      data: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        totalContacts: campaign.totalContacts,
        createdAt: campaign.createdAt,
      },
      summary: {
        total: body.contacts.length,
        valid: validContacts.length,
        invalid: invalidContacts.length,
        blocked: blockedContacts.length,
      },
    });
  } catch (error) {
    console.error("[CAMPAIGNS] Error creating campaign:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create campaign",
      },
      { status: 500 }
    );
  }
}
