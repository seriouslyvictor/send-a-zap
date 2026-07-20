import { NextResponse } from "next/server";
import QRCode from "qrcode";

import {
  DEMO_INSTANCE_NAME,
  getEvolutionAPI,
  type EvolutionConnection,
} from "@/lib/evolution-api";
import { getPrisma } from "@/lib/prisma";

const CONNECTION_ID = "demo";

async function getOrCreateConnection(): Promise<EvolutionConnection> {
  const prisma = getPrisma();
  const stored = await prisma.evolutionConnection.findUnique({ where: { id: CONNECTION_ID } });
  if (stored) return stored;

  const created = await getEvolutionAPI().createInstance(DEMO_INSTANCE_NAME);
  return prisma.evolutionConnection.upsert({
    where: { id: CONNECTION_ID },
    create: { id: CONNECTION_ID, ...created },
    update: created,
  });
}

async function qrImage(connection: EvolutionConnection): Promise<string | null> {
  const qr = await getEvolutionAPI().getQRCode(connection);
  if (qr.base64) return qr.base64;
  return qr.code ? QRCode.toDataURL(qr.code, { width: 300, margin: 2 }) : null;
}

export async function POST() {
  try {
    const connection = await getOrCreateConnection();
    const status = await getEvolutionAPI().getConnectionStatus(connection);
    if (status.connected) {
      return NextResponse.json({
        success: true,
        instanceName: connection.instanceName,
        alreadyConnected: true,
      });
    }

    await getEvolutionAPI().connectInstance(connection, {
      webhookUrl: process.env.EVOLUTION_WEBHOOK_URL,
      subscribe: ["MESSAGE", "CONNECTION", "QRCODE", "READ_RECEIPT"],
    });

    return NextResponse.json({
      success: true,
      instanceName: connection.instanceName,
      qrCode: await qrImage(connection),
      pairingCode: null,
    });
  } catch (error) {
    console.error("Evolution Go connect error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Connection failed" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const stored = await getPrisma().evolutionConnection.findUnique({
      where: { id: CONNECTION_ID },
    });
    if (!stored) {
      return NextResponse.json({ success: false, error: "Connection not created" }, { status: 404 });
    }
    return NextResponse.json({ success: true, qrCode: await qrImage(stored), pairingCode: null });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "QR retrieval failed" },
      { status: 500 },
    );
  }
}
