import { NextResponse } from "next/server";
import { authenticateExtension } from "@/lib/connections/auth";
import { claimNextAction } from "@/lib/automation/store";

export async function GET(request: Request) {
  const connection = await authenticateExtension(request);
  if (!connection) {
    return NextResponse.json({ error: "Token non valido" }, { status: 401 });
  }

  const action = await claimNextAction(connection.id);
  if (!action) {
    return NextResponse.json({ action: null });
  }

  return NextResponse.json({
    action: {
      id: action.id,
      type: action.type,
      leadLinkedinUrl: action.leadLinkedinUrl,
      leadFirstName: action.leadFirstName,
      text: action.payload.text ?? null,
    },
  });
}
