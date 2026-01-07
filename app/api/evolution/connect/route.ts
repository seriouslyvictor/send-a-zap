import { NextResponse } from "next/server";
import { evolutionAPI } from "@/lib/evolution-api";
import type { EvolutionInstance } from "@/types/evolution-api";
import QRCode from "qrcode";

// Fixed instance name for single-session use
const INSTANCE_NAME = "whatsapp-main";

/**
 * Generate QR code base64 image from raw code data
 */
async function generateQRCodeBase64(code: string): Promise<string> {
  try {
    const base64 = await QRCode.toDataURL(code, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });
    return base64;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
}

/**
 * POST /api/evolution/connect
 * Creates a new instance or retrieves QR code for existing instance
 *
 * Flow:
 * 1. Check if instance exists
 * 2. If exists but disconnected (status: "close") -> get QR code
 * 3. If exists and connected (status: "open") -> return already connected
 * 4. If not exists -> create instance and get QR code
 */
export async function POST() {
  try {
    // Check if instance already exists
    let instances: EvolutionInstance[] = [];
    try {
      instances = await evolutionAPI.fetchInstances(INSTANCE_NAME);
    } catch (error) {
      console.error("Error fetching instances:", error);
      instances = [];
    }

    const existingInstance = instances?.find(
      (inst) => inst.instanceName === INSTANCE_NAME
    );

    // If instance exists and is connected, return success
    if (existingInstance?.status === "open") {
      return NextResponse.json({
        success: true,
        instanceName: INSTANCE_NAME,
        alreadyConnected: true,
        message: "Instance is already connected",
      });
    }

    let qrCodeData;
    let base64Image: string | null = null;

    if (existingInstance) {
      // Instance exists but not connected, get QR code
      console.log("Instance exists but disconnected, fetching QR code...");
      qrCodeData = await evolutionAPI.getQRCode(INSTANCE_NAME);
    } else {
      // Create new instance
      console.log("Creating new instance...");
      const createResponse = await evolutionAPI.createInstance({
        instanceName: INSTANCE_NAME,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
      });

      // Create instance response includes qrcode directly
      qrCodeData = createResponse.qrcode;
    }

    // Generate QR code image from code data if we have it
    if (qrCodeData?.code) {
      base64Image = await generateQRCodeBase64(qrCodeData.code);
    } else if (qrCodeData?.base64) {
      // Some responses include base64 directly
      base64Image = qrCodeData.base64;
    }

    return NextResponse.json({
      success: true,
      instanceName: INSTANCE_NAME,
      qrCode: base64Image,
      pairingCode: qrCodeData?.pairingCode || null,
    });
  } catch (error) {
    console.error("Evolution API connect error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to connect to Evolution API",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/evolution/connect
 * Retrieves current QR code for the main instance (for refresh)
 */
export async function GET() {
  try {
    const qrCodeData = await evolutionAPI.getQRCode(INSTANCE_NAME);

    let base64Image: string | null = null;

    // Generate QR code image from code data
    if (qrCodeData?.code) {
      base64Image = await generateQRCodeBase64(qrCodeData.code);
    } else if (qrCodeData?.base64) {
      base64Image = qrCodeData.base64;
    }

    return NextResponse.json({
      success: true,
      qrCode: base64Image,
      pairingCode: qrCodeData?.pairingCode || null,
    });
  } catch (error) {
    console.error("Evolution API QR code error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve QR code",
      },
      { status: 500 }
    );
  }
}
