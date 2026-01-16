import { NextResponse } from "next/server";
import { getEvolutionAPI } from "@/lib/evolution-api";

// Fixed instance name for single-session use
const INSTANCE_NAME = "whatsapp-main";

/**
 * GET /api/evolution/status
 * Retrieves connection status of the main WhatsApp instance
 */
export async function GET() {
  console.log("[STATUS] Checking connection status for instance:", INSTANCE_NAME);

  try {
    // Fetch instance details
    console.log("[STATUS] Fetching instances from Evolution API...");
    const instances = await getEvolutionAPI().fetchInstances(INSTANCE_NAME);
    console.log("[STATUS] Instances response:", JSON.stringify(instances, null, 2));

    // Handle empty or invalid response
    if (!instances || !Array.isArray(instances) || instances.length === 0) {
      return NextResponse.json({
        success: true,
        connected: false,
        status: "not_found",
        message: "Instance not created yet",
      });
    }

    const instance = instances.find(
      (inst) => inst?.instanceName === INSTANCE_NAME
    );

    if (!instance) {
      return NextResponse.json({
        success: true,
        connected: false,
        status: "not_found",
        message: "Instance not found in response",
      });
    }

    // Try to get detailed connection status
    let connectionState;
    try {
      connectionState = await getEvolutionAPI().getConnectionStatus(INSTANCE_NAME);
    } catch (error) {
      console.log("Could not fetch connection state:", error);
    }

    const isConnected = instance.status === "open";

    return NextResponse.json({
      success: true,
      connected: isConnected,
      status: instance.status,
      state: connectionState?.state || instance.status,
      instanceName: instance.instanceName,
      instanceId: instance.instanceId,
      profileName: instance.profileName,
      profilePictureUrl: instance.profilePictureUrl,
      profileStatus: instance.profileStatus,
      owner: instance.owner,
    });
  } catch (error) {
    console.error("Evolution API status error:", error);
    return NextResponse.json(
      {
        success: false,
        connected: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch connection status",
      },
      { status: 500 }
    );
  }
}
