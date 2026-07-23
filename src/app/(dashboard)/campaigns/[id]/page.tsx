import { notFound } from "next/navigation";
import Link from "next/link";
import { getCampaign } from "@/lib/campaigns/store";
import { getAgent } from "@/lib/agents/store";
import { getLeadList } from "@/lib/leads/store";
import { listConnections } from "@/lib/connections/store";
import { listActionsForCampaign } from "@/lib/automation/store";
import DeleteCampaignButton from "./DeleteCampaignButton";
import ActivateCampaignPanel from "./ActivateCampaignPanel";
import ActionsQueue from "./ActionsQueue";

type Props = { params: Promise<{ id: string }> };

export default async function CampaignDetailPage({ params }: Props) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  const [agent, leadList, connections, actions] = await Promise.all([
    getAgent(campaign.agentId),
    getLeadList(campaign.leadListId),
    listConnections(),
    campaign.status === "active" ? listActionsForCampaign(campaign.id) : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-2xl px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{campaign.name}</h1>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${
              campaign.status === "active"
                ? "bg-green-100 text-green-700"
                : "bg-neutral-100 text-neutral-500"
            }`}
          >
            {campaign.status}
          </span>
        </div>
        <DeleteCampaignButton campaignId={campaign.id} />
      </div>

      {campaign.status === "draft" ? (
        <div className="mt-6">
          <ActivateCampaignPanel campaignId={campaign.id} connections={connections} />
        </div>
      ) : (
        <div className="mt-6">
          <ActionsQueue actions={actions} />
        </div>
      )}

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
                (dopo {campaign.followUpDelayDays} giorni, non ancora sensibile alle risposte — vedi limiti
                nel README dell&apos;estensione)
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
