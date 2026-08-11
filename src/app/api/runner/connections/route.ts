import { NextResponse } from "next/server";
import { authenticateRunnerMaster } from "@/lib/connections/auth";
import { listAllConnectionTokens } from "@/lib/connections/store";

// Polled by the shared cloud runner (runner/) to know which connections
// exist across every tenant — see authenticateRunnerMaster for why this is
// a separate, platform-wide trust level from the per-connection bearer
// tokens the rest of /api/extension/* uses.
export async function GET(request: Request) {
  if (!authenticateRunnerMaster(request)) {
    return NextResponse.json({ error: "Invalid runner key" }, { status: 401 });
  }

  try {
    const connections = await listAllConnectionTokens();
    return NextResponse.json({ connections });
  } catch (err) {
    console.error("[runner/connections] failed to list connections:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
