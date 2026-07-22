import Link from "next/link";
import { listAgents } from "@/lib/agents/store";

export default async function GetStartedPage() {
  const agents = await listAgents();

  return (
    <div className="max-w-3xl px-8 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">Get Started</h1>
      <p className="mt-2 text-neutral-500">
        Benvenuto in ReachOS. Il primo modulo pronto è l&apos;AI Assistant Builder: crea un agent, poi
        testalo nella Sandbox. Gli altri moduli (Lead Finder, Campaigns, Inbox, Connections, Reports) sono
        i prossimi passi della roadmap.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/ai-assistants/new"
          className="rounded-lg border border-neutral-200 bg-white p-5 hover:border-neutral-400 transition-colors"
        >
          <div className="text-sm font-medium text-neutral-900">1. Crea un AI Assistant</div>
          <p className="mt-1 text-sm text-neutral-500">
            Wizard guidato: azienda, value proposition, tono, link calendario.
          </p>
        </Link>
        <Link
          href="/sandbox"
          className="rounded-lg border border-neutral-200 bg-white p-5 hover:border-neutral-400 transition-colors"
        >
          <div className="text-sm font-medium text-neutral-900">2. Testalo in Sandbox</div>
          <p className="mt-1 text-sm text-neutral-500">
            Simula una conversazione con un prospect finto prima di andare live.
          </p>
        </Link>
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-900">I tuoi AI Assistants</h2>
          <Link href="/ai-assistants" className="text-sm text-neutral-500 hover:text-neutral-900">
            Vedi tutti →
          </Link>
        </div>
        {agents.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Non hai ancora creato nessun agent.</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {agents.slice(0, 5).map((agent) => (
              <li key={agent.id} className="px-4 py-3 text-sm">
                <Link href={`/ai-assistants/${agent.id}`} className="font-medium text-neutral-900 hover:underline">
                  {agent.name || "(senza nome)"}
                </Link>
                <span className="ml-2 text-neutral-400">{agent.companyName}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
