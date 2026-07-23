import type { AutomationAction } from "@/lib/automation/types";

const STATUS_LABEL: Record<AutomationAction["status"], string> = {
  pending: "In coda",
  in_progress: "In corso",
  done: "Completata",
  failed: "Fallita",
  expired: "Scaduta",
};

const TYPE_LABEL: Record<AutomationAction["type"], string> = {
  send_connection_request: "Richiesta connessione",
  check_acceptance: "Verifica accettazione",
  send_message: "Messaggio",
};

export default function ActionsQueue({ actions }: { actions: AutomationAction[] }) {
  const counts = actions.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-900">Coda azioni</h3>
        <div className="flex gap-1.5 text-xs">
          {Object.entries(counts).map(([status, count]) => (
            <span key={status} className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600">
              {STATUS_LABEL[status as AutomationAction["status"]]}: {count}
            </span>
          ))}
        </div>
      </div>

      {actions.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-400">Nessuna azione in coda.</p>
      ) : (
        <div className="mt-3 max-h-80 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-neutral-400">
              <tr>
                <th className="pb-1 pr-3">Lead</th>
                <th className="pb-1 pr-3">Azione</th>
                <th className="pb-1 pr-3">Stato</th>
                <th className="pb-1">Programmata</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((a) => (
                <tr key={a.id} className="border-t border-neutral-100">
                  <td className="py-1.5 pr-3">{a.leadFirstName || a.leadLinkedinUrl}</td>
                  <td className="py-1.5 pr-3">{TYPE_LABEL[a.type]}</td>
                  <td className="py-1.5 pr-3">
                    {STATUS_LABEL[a.status]}
                    {a.lastError && (
                      <span className="ml-1 text-red-500" title={a.lastError}>
                        ⚠
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 text-neutral-400">
                    {new Date(a.scheduledAt).toLocaleString("it-IT")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
