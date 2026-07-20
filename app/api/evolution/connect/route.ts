import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import QRCode from "qrcode";

import {
  EVOLUTION_CONNECTION_ID,
  lockEvolutionConnection,
} from "@/lib/evolution-connection";
import {
  assertDemoInstanceTarget,
  createDemoInstanceName,
  EvolutionAPIError,
  getEvolutionAPI,
  type EvolutionConnection,
} from "@/lib/evolution-api";
import { getPrisma } from "@/lib/prisma";

async function getOrCreateConnection(
  prisma: Prisma.TransactionClient,
): Promise<EvolutionConnection> {
  const stored = await prisma.evolutionConnection.findUnique({
    where: { id: EVOLUTION_CONNECTION_ID },
  });
  if (stored) {
    assertDemoInstanceTarget(stored, stored.instanceId);
    return stored;
  }

  const created = await getEvolutionAPI().createInstance(createDemoInstanceName());
  return prisma.evolutionConnection.upsert({
    where: { id: EVOLUTION_CONNECTION_ID },
    create: { id: EVOLUTION_CONNECTION_ID, ...created },
    update: created,
  });
}

async function connectionAndStatus(prisma: Prisma.TransactionClient) {
  let connection = await getOrCreateConnection(prisma);

  try {
    return {
      connection,
      status: await getEvolutionAPI().getConnectionStatus(connection),
    };
  } catch (error) {
    if (!(error instanceof EvolutionAPIError) || error.status !== 404) throw error;

    await prisma.evolutionConnection.deleteMany({
      where: { id: EVOLUTION_CONNECTION_ID, instanceId: connection.instanceId },
    });
    connection = await getOrCreateConnection(prisma);
    return {
      connection,
      status: await getEvolutionAPI().getConnectionStatus(connection),
    };
  }
}

async function qrImage(connection: EvolutionConnection): Promise<string | null> {
  const qr = await getEvolutionAPI().getQRCode(connection);
  if (qr.base64) return qr.base64;
  return qr.code ? QRCode.toDataURL(qr.code, { width: 300, margin: 2 }) : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { consent?: unknown } | null;
    if (body?.consent !== true) {
      return NextResponse.json(
        { success: false, error: "Consent is required before creating a Connection" },
        { status: 400 },
      );
    }

    const payload = await getPrisma().$transaction(
      async (transaction) => {
        await lockEvolutionConnection(transaction);
        const { connection, status } = await connectionAndStatus(transaction);
        if (status.connected) {
          return {
            success: true,
            alreadyConnected: true,
            owner: status.jid,
          };
        }

        await getEvolutionAPI().connectInstance(connection, {
          webhookUrl: process.env.EVOLUTION_WEBHOOK_URL,
          subscribe: ["MESSAGE", "CONNECTION", "QRCODE", "READ_RECEIPT"],
        });

        return {
          success: true,
          qrCode: await qrImage(connection),
          pairingCode: null,
        };
      },
      { maxWait: 30_000, timeout: 30_000 },
    );

    return NextResponse.json(payload);
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
      where: { id: EVOLUTION_CONNECTION_ID },
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
