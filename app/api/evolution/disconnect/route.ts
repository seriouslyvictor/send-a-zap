import { NextResponse } from "next/server";
import { evolutionAPI } from "@/lib/evolution-api";

// Fixed instance name for single-session use
const INSTANCE_NAME = "whatsapp-main";

/**
 * POST /api/evolution/disconnect
 * Disconnects the main WhatsApp instance
 */
export async function POST() {
  try {
    // Logout the instance (disconnect but keep instance)
    const result = await evolutionAPI.logoutInstance(INSTANCE_NAME);

    return NextResponse.json({
      success: true,
      message: "Instance disconnected successfully",
      status: result.status,
    });
  } catch (error) {
    console.error("Evolution API disconnect error:", error);
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
    const result = await evolutionAPI.deleteInstance(INSTANCE_NAME);

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
