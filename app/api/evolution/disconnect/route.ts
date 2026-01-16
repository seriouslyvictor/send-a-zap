import { NextResponse } from "next/server";
import { getEvolutionAPI } from "@/lib/evolution-api";

// Fixed instance name for single-session use
const INSTANCE_NAME = "whatsapp-main";

/**
 * POST /api/evolution/disconnect
 * Disconnects the main WhatsApp instance
 */
export async function POST() {
  console.log("[DISCONNECT] Starting disconnect for instance:", INSTANCE_NAME);

  try {
    // Delete the instance completely (logout is unreliable in Evolution API)
    // The connect flow will recreate the instance when user reconnects
    console.log("[DISCONNECT] Calling getEvolutionAPI().deleteInstance...");
    const result = await getEvolutionAPI().deleteInstance(INSTANCE_NAME);
    console.log("[DISCONNECT] Delete result:", JSON.stringify(result, null, 2));

    return NextResponse.json({
      success: true,
      message: "Instance disconnected successfully",
      status: result.status,
    });
  } catch (error) {
    console.error("[DISCONNECT] Evolution API disconnect error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to disconnect instance",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/evolution/disconnect
 * Completely deletes the main WhatsApp instance
 */
export async function DELETE() {
  try {
    // Delete the instance completely
    const result = await getEvolutionAPI().deleteInstance(INSTANCE_NAME);

    return NextResponse.json({
      success: true,
      message: "Instance deleted successfully",
      status: result.status,
    });
  } catch (error) {
    console.error("Evolution API delete error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete instance",
      },
      { status: 500 }
    );
  }
}
