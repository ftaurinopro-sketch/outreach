import { notFound } from "next/navigation";
import Link from "next/link";
import { getCampaign } from "@/lib/campaigns/store";
import { getAgent } from "@/lib/agents/store";
import { getLeadList } from "@/lib/leads/store";
import DeleteCampaignButton from "./DeleteCampaignButton";

type Props = { params: Promise<{ id: string }> };

export default async function CampaignDetailPage({ params }: Props) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  const [agent, leadList] = await Promise.all([
    getAgent(campaign.agentId),
    getLeadList(campaign.leadListId),
  ]);

  return (
    <div className="max-w-2xl px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{campaign.name}</h1>
          <span className="mt-1 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
            {campaign.status}
          </span>
        </div>
        <DeleteCampaignButton campaignId={campaign.id} />
      </div>

      <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Bozza: l&apos;invio reale richiede il modulo Connections / motore di automazione, non ancora
        costruito.
      </div>

      <div className="mt-6 space-y-4 rounded-lg border border-neutral-200 bg-white p-5 text-sm">
        <Row label="Lista lead">
          {leadList ? (
            <Link href={`/lead-finder/${leadList.id}`} className="text-neutral-900 hover:underline">
              {leadList.name} ({leadList.leads.length} lead)
            </Link>
          ) : (
            <span className="text-red-600">lista eliminata</span>
          )}
        </Row>
        <Row label="AI Assistant">
          {agent ? (
            <Link href={`/ai-assistants/${agent.id}`} className="text-neutral-900 hover:underline">
              {agent.name}
            </Link>
          ) : (
            <span className="text-red-600">agent eliminato</span>
          )}
        </Row>
        <Row label="Nota di connessione">
          {campaign.connectionNote || <span className="text-neutral-400">—</span>}
        </Row>
        <Row label="Messaggio 1">{campaign.message1}</Row>
        <Row label="Follow-up">
          {campaign.followUpMessage ? (
            <>
              {campaign.followUpMessage}
              <span className="ml-1 text-neutral-400">
                (dopo {campaign.followUpDelayDays} giorni se non risponde)
              </span>
            </>
          ) : (
            <span className="text-neutral-400">—</span>
          )}
        </Row>
        <Row label="Reply mode">
          {campaign.replyMode === "autonomous" ? "Fully Autonomous" : "Review Before Sending"}
        </Row>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-neutral-400">{label}</div>
      <div className="mt-0.5 text-neutral-800">{children}</div>
    </div>
  );
}
