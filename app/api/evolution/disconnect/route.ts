import { NextResponse } from "next/server";

import { deleteDemoConnection } from "@/lib/evolution-connection";
import { getPrisma } from "@/lib/prisma";

export async function POST() {
  try {
    const result = await deleteDemoConnection(getPrisma());
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Disconnect failed" },
      { status: 500 },
    );
  }
}

export const DELETE = POST;
