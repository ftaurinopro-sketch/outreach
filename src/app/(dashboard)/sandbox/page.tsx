import { listAgents } from "@/lib/agents/store";
import { hasClaudeConfig } from "@/lib/claude";
import SandboxClient from "./SandboxClient";

type Props = { searchParams: Promise<{ agent?: string }> };

export default async function SandboxPage({ searchParams }: Props) {
  const [agents, { agent: initialAgentId }] = await Promise.all([listAgents(), searchParams]);

  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">Sandbox</h1>
      <p className="mt-1 max-w-2xl text-sm text-neutral-500">
        Simula una conversazione con un prospect finto per testare come risponde un agent prima di usarlo in
        una campagna reale.
      </p>

      {!hasClaudeConfig() && (
        <div className="mt-4 max-w-2xl rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Manca <code className="font-mono">ANTHROPIC_API_KEY</code> in <code className="font-mono">.env.local</code>.
          Aggiungila per poter chattare con l&apos;agent qui in Sandbox.
        </div>
      )}

      {agents.length === 0 ? (
        <div className="mt-6 max-w-2xl rounded-lg border border-dashed border-neutral-300 bg-white px-5 py-10 text-center text-sm text-neutral-500">
          Crea prima un AI Assistant per poterlo testare qui.
        </div>
      ) : (
        <div className="mt-6">
          <SandboxClient agents={agents} initialAgentId={initialAgentId} />
        </div>
      )}
    </div>
  );
}
