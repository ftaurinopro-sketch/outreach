import { NextResponse } from "next/server";
import { authenticateExtension } from "@/lib/connections/auth";
import { claimNextScrapeJob } from "@/lib/scrape-jobs/store";

export async function GET(request: Request) {
  const connection = await authenticateExtension(request);
  if (!connection) {
    return NextResponse.json({ error: "Token non valido" }, { status: 401 });
  }

  const job = await claimNextScrapeJob(connection.id);
  if (!job) {
    return NextResponse.json({ job: null });
  }

  return NextResponse.json({
    job: { id: job.id, searchUrl: job.searchUrl, sourceType: job.sourceType },
  });
}
