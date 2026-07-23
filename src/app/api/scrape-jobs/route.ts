import { NextResponse } from "next/server";
import { createScrapeJob, listScrapeJobs } from "@/lib/scrape-jobs/store";
import { detectSourceType } from "@/lib/scrape-jobs/types";
import { getConnection } from "@/lib/connections/store";
import { getCurrentUserId } from "@/lib/supabase/user";

export async function GET() {
  const userId = await getCurrentUserId();
  const jobs = await listScrapeJobs(userId);
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { connectionId?: string; listName?: string; searchUrl?: string };

  if (!body.connectionId || !body.listName || !body.searchUrl) {
    return NextResponse.json(
      { error: "connectionId, listName e searchUrl sono obbligatori" },
      { status: 400 }
    );
  }

  const connection = await getConnection(body.connectionId);
  if (!connection) {
    return NextResponse.json({ error: "Connessione non trovata" }, { status: 404 });
  }
  if (!connection.sessionCookie) {
    return NextResponse.json(
      { error: "Questa connessione non ha ancora un cookie di sessione configurato (vedi /connections)" },
      { status: 409 }
    );
  }

  const userId = await getCurrentUserId();
  const job = await createScrapeJob({
    userId,
    connectionId: body.connectionId,
    listName: body.listName,
    searchUrl: body.searchUrl,
    sourceType: detectSourceType(body.searchUrl),
  });

  return NextResponse.json({ job }, { status: 201 });
}
