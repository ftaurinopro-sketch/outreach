import { getTranslations } from "next-intl/server";
import { listConnections } from "@/lib/connections/store";
import { isConnectionOnline } from "@/lib/connections/types";
import ConnectionsClient from "./ConnectionsClient";

export default async function ConnectionsPage() {
  const [connections, t] = await Promise.all([listConnections(), getTranslations("Connections")]);
  const withStatus = connections.map((c) => ({ ...c, online: isConnectionOnline(c) }));

  return (
    <div className="max-w-3xl px-8 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">{t("title")}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {t.rich("description", {
          strong: (chunks) => <strong>{chunks}</strong>,
          code: (chunks) => <code className="font-mono">{chunks}</code>,
        })}
      </p>

      <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {t.rich("warning", { code: (chunks) => <code className="font-mono">{chunks}</code> })}
      </div>

      <div className="mt-6">
        <ConnectionsClient initialConnections={withStatus} />
      </div>
    </div>
  );
}
