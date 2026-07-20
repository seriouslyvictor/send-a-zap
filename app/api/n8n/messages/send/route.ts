import { NextResponse } from "next/server";

import {
  CampaignExecutionError,
  sendClaimedCampaignMessage,
} from "@/lib/campaign-executor";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messageId?: string };
    if (!body.messageId) {
      return NextResponse.json(
        { error: "validation_error", message: "messageId is required" },
        { status: 400 },
      );
    }
    return NextResponse.json(await sendClaimedCampaignMessage(body.messageId));
  } catch (error) {
    const status = error instanceof CampaignExecutionError ? error.status : 502;
    return NextResponse.json(
      {
        error:
          error instanceof CampaignExecutionError ? error.code : "upstream_error",
        message: error instanceof Error ? error.message : "Message send failed",
      },
      { status },
    );
  }
}
