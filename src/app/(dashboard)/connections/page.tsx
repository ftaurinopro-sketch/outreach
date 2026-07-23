import { listConnections } from "@/lib/connections/store";
import { isConnectionOnline } from "@/lib/connections/types";
import ConnectionsClient from "./ConnectionsClient";

export default async function ConnectionsPage() {
  const connections = await listConnections();
  const withStatus = connections.map((c) => ({ ...c, online: isConnectionOnline(c) }));

  return (
    <div className="max-w-3xl px-8 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">Connections</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Collega un profilo LinkedIn tramite il <strong>runner cloud</strong> (in <code className="font-mono">runner/</code>):
        un cookie di sessione LinkedIn autentica un browser headless come se accedessi da un altro
        dispositivo — non serve tenere Chrome aperto.
      </p>

      <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Il runner esegue azioni reali sul tuo account LinkedIn (richieste di connessione, messaggi).
        LinkedIn può segnalare l&apos;accesso da un &quot;nuovo dispositivo&quot; e chiedere una verifica la
        prima volta. Testalo prima su un account secondario e con limiti bassi — vedi{" "}
        <code className="font-mono">runner/README.md</code> nel repo. (È rimasta disponibile anche
        l&apos;estensione Chrome in <code className="font-mono">extension/</code>, come alternativa.)
      </div>

      <div className="mt-6">
        <ConnectionsClient initialConnections={withStatus} />
      </div>
    </div>
  );
}
