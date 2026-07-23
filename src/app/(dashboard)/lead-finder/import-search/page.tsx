import Link from "next/link";
import { listConnections } from "@/lib/connections/store";
import SearchImportClient from "./SearchImportClient";

export default async function ImportSearchPage() {
  const connections = await listConnections();
  const ready = connections.filter((c) => c.sessionCookie);

  return (
    <div className="max-w-2xl px-8 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">Importa da ricerca LinkedIn</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Vai su LinkedIn o Sales Navigator, fai la tua ricerca, copia l&apos;URL dalla barra indirizzi e
        incollalo qui sotto — il tipo viene rilevato automaticamente. Il runner (con la connessione che
        scegli) apre la pagina ed estrae i risultati.
      </p>

      {ready.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 bg-white px-5 py-8 text-sm text-neutral-500">
          Serve prima una{" "}
          <Link href="/connections" className="text-neutral-900 underline">
            connessione con un cookie di sessione configurato
          </Link>
          .
        </div>
      ) : (
        <div className="mt-6">
          <SearchImportClient connections={ready} />
        </div>
      )}
    </div>
  );
}
