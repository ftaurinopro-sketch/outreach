import { notFound } from "next/navigation";
import Link from "next/link";
import { getAgent } from "@/lib/agents/store";
import AgentEditForm from "./AgentEditForm";

type Props = { params: Promise<{ id: string }> };

export default async function AgentDetailPage({ params }: Props) {
  const { id } = await params;
  const agent = await getAgent(id);
  if (!agent) notFound();

  return (
    <div className="max-w-2xl px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">{agent.name}</h1>
        <Link
          href={`/sandbox?agent=${agent.id}`}
          className="rounded-md bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Testa in Sandbox →
        </Link>
      </div>
      <p className="mt-1 text-sm text-neutral-500">{agent.companyName}</p>

      <div className="mt-6">
        <AgentEditForm agent={agent} />
      </div>
    </div>
  );
}
