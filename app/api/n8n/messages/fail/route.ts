import { NextResponse } from "next/server";

import {
  CampaignExecutionError,
  failClaimedCampaignMessage,
} from "@/lib/campaign-executor";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      messageId?: string;
      errorMessage?: string;
    };
    if (!body.messageId) {
      return NextResponse.json(
        { error: "validation_error", message: "messageId is required" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      await failClaimedCampaignMessage(
        body.messageId,
        body.errorMessage ?? "n8n could not reach the send operation",
      ),
    );
  } catch (error) {
    const status = error instanceof CampaignExecutionError ? error.status : 500;
    return NextResponse.json(
      {
        error:
          error instanceof CampaignExecutionError ? error.code : "internal_error",
        message: error instanceof Error ? error.message : "Message failure update failed",
      },
      { status },
    );
  }
}
