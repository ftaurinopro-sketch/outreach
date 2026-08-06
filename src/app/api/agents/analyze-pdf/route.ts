import { NextResponse } from "next/server";
import { hasClaudeConfig } from "@/lib/claude";
import { analyzeCompanyPdf } from "@/lib/agents/analyzePdf";

const MAX_FILE_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  if (!hasClaudeConfig()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY non configurata: necessaria per l'analisi del documento." },
      { status: 501 }
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File) || file.type !== "application/pdf") {
    return NextResponse.json({ error: "File non valido: serve un PDF." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File troppo grande (max 15MB)." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const profile = await analyzeCompanyPdf(buffer);
    return NextResponse.json(profile);
  } catch (error) {
    console.error("PDF analysis error", error);
    return NextResponse.json({ error: "Errore durante l'analisi del PDF" }, { status: 502 });
  }
}
