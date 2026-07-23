import Link from "next/link";
import { listAgents } from "@/lib/agents/store";
import { listLeadLists } from "@/lib/leads/store";
import CampaignForm from "./CampaignForm";

export default async function NewCampaignPage() {
  const [agents, leadLists] = await Promise.all([listAgents(), listLeadLists()]);

  if (agents.length === 0 || leadLists.length === 0) {
    return (
      <div className="max-w-2xl px-8 py-10">
        <h1 className="text-2xl font-semibold text-neutral-900">Nuova Campagna</h1>
        <div className="mt-4 rounded-lg border border-dashed border-neutral-300 bg-white px-5 py-8 text-sm text-neutral-500">
          Prima di creare una campagna ti servono:
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              almeno un <strong>AI Assistant</strong> ({agents.length > 0 ? "✓ presente" : (
                <Link href="/ai-assistants/new" className="text-neutral-900 underline">
                  creane uno
                </Link>
              )})
            </li>
            <li>
              almeno una <strong>lista lead</strong> ({leadLists.length > 0 ? "✓ presente" : (
                <Link href="/lead-finder/import" className="text-neutral-900 underline">
                  importane una
                </Link>
              )})
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl px-8 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">Nuova Campagna</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Sequenza fissa per l&apos;MVP: nota di connessione (opzionale) → messaggio 1 dopo l&apos;accettazione →
        un follow-up se non c&apos;è risposta.
      </p>
      <div className="mt-6">
        <CampaignForm agents={agents} leadLists={leadLists} />
      </div>
    </div>
  );
}
