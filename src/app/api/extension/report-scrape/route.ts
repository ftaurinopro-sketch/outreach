import { NextResponse } from "next/server";
import { authenticateExtension } from "@/lib/connections/auth";
import { completeScrapeJob, failScrapeJob, getScrapeJob } from "@/lib/scrape-jobs/store";
import { createLeadList } from "@/lib/leads/store";
import type { Lead } from "@/lib/leads/types";

type ReportBody = {
  jobId: string;
  success: boolean;
  error?: string;
  leads?: Partial<Lead>[];
};

export async function POST(request: Request) {
  const connection = await authenticateExtension(request);
  if (!connection) {
    return NextResponse.json({ error: "Token non valido" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<ReportBody>;
  if (!body.jobId || typeof body.success !== "boolean") {
    return NextResponse.json({ error: "jobId e success sono obbligatori" }, { status: 400 });
  }

  const job = await getScrapeJob(body.jobId);
  if (!job || job.connectionId !== connection.id) {
    return NextResponse.json({ error: "Job non trovato" }, { status: 404 });
  }

  if (!body.success) {
    await failScrapeJob(job.id, body.error ?? "Errore non specificato durante lo scraping");
    return NextResponse.json({ ok: true });
  }

  const leads: Lead[] = (body.leads ?? [])
    .filter((l) => l.linkedinUrl)
    .map((l) => ({
      linkedinUrl: l.linkedinUrl ?? "",
      firstName: l.firstName ?? "",
      lastName: l.lastName ?? "",
      headline: l.headline ?? "",
      location: l.location ?? "",
      company: l.company ?? "",
      position: l.position ?? "",
      industry: l.industry ?? "",
    }));

  if (leads.length === 0) {
    await failScrapeJob(job.id, "Nessun lead trovato nella pagina dei risultati (selettore da aggiornare?)");
    return NextResponse.json({ ok: true });
  }

  const list = await createLeadList(job.listName, job.sourceType, leads);
  await completeScrapeJob(job.id, { resultListId: list.id, resultCount: leads.length });

  return NextResponse.json({ ok: true });
}
