import AgentWizard from "./AgentWizard";

export default function NewAgentPage() {
  return (
    <div className="max-w-2xl px-8 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">Nuovo AI Assistant</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Rispondi alle domande: più sei dettagliato, meglio l&apos;agent performerà nelle conversazioni reali.
      </p>
      <div className="mt-6">
        <AgentWizard />
      </div>
    </div>
  );
}
