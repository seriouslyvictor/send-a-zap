import { NextResponse } from "next/server";

import {
  CampaignExecutionError,
  claimNextCampaignMessage,
} from "@/lib/campaign-executor";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      campaignId?: string;
      executionId?: string;
    };
    if (!body.campaignId) {
      return NextResponse.json(
        { error: "validation_error", message: "campaignId is required" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      await claimNextCampaignMessage(body.campaignId, body.executionId),
    );
  } catch (error) {
    const status = error instanceof CampaignExecutionError ? error.status : 500;
    return NextResponse.json(
      {
        error:
          error instanceof CampaignExecutionError ? error.code : "internal_error",
        message: error instanceof Error ? error.message : "Message claim failed",
      },
      { status },
    );
  }
}
