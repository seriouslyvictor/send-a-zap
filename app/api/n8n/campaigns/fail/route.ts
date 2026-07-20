import { NextResponse } from "next/server";

import { failCampaignExecution } from "@/lib/campaign-executor";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      campaignId?: string;
      executionId?: string;
      errorMessage?: string;
    };
    if (!body.campaignId && !body.executionId) {
      return NextResponse.json(
        {
          error: "validation_error",
          message: "campaignId or executionId is required",
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      await failCampaignExecution(
        { campaignId: body.campaignId, executionId: body.executionId },
        body.errorMessage ?? "Unhandled n8n workflow failure",
      ),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "internal_error",
        message: error instanceof Error ? error.message : "Campaign failure update failed",
      },
      { status: 500 },
    );
  }
}
