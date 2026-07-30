import { getTranslations } from "next-intl/server";
import { LEAD_STATUSES, type CampaignMonitoring, type LeadStatus } from "@/lib/campaigns/monitoring";

const STATUS_COLOR: Record<LeadStatus, string> = {
  pending: "bg-neutral-100 text-neutral-500",
  connection_sent: "bg-blue-100 text-blue-700",
  connected: "bg-cyan-100 text-cyan-700",
  messaging: "bg-amber-100 text-amber-700",
  replied: "bg-purple-100 text-purple-700",
  done: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export default async function MonitoringPanel({
  monitoring,
  locale,
}: {
  monitoring: CampaignMonitoring;
  locale: string;
}) {
  const t = await getTranslations("MonitoringPanel");

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <h3 className="text-sm font-medium text-neutral-900">{t("title")}</h3>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {LEAD_STATUSES.map((status) => (
          <span
            key={status}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[status]}`}
          >
            {t(`status.${status}`)}: {monitoring.counts[status]}
          </span>
        ))}
      </div>

      {monitoring.rows.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-400">{t("empty")}</p>
      ) : (
        <div className="mt-4 max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-neutral-400">
              <tr>
                <th className="pb-1.5 pr-3">{t("colLead")}</th>
                <th className="pb-1.5 pr-3">{t("colStatus")}</th>
                <th className="pb-1.5 pr-3">{t("colConnectedAt")}</th>
                <th className="pb-1.5 pr-3">{t("colMessagesSent")}</th>
                <th className="pb-1.5">{t("colLastActivity")}</th>
              </tr>
            </thead>
            <tbody>
              {monitoring.rows.map((row) => (
                <tr key={row.linkedinUrl} className="border-t border-neutral-100">
                  <td className="py-1.5 pr-3">
                    <a
                      href={row.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-neutral-800 hover:underline"
                    >
                      {row.firstName} {row.lastName}
                    </a>
                    {row.company && <span className="ml-1 text-neutral-400">· {row.company}</span>}
                  </td>
                  <td className="py-1.5 pr-3">
                    <span className={`rounded-full px-2 py-0.5 ${STATUS_COLOR[row.status]}`}>
                      {t(`status.${row.status}`)}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 text-neutral-400">
                    {row.connectedAt ? new Date(row.connectedAt).toLocaleDateString(locale) : "—"}
                  </td>
                  <td className="py-1.5 pr-3 text-neutral-400">{row.messagesSent}</td>
                  <td className="py-1.5 text-neutral-400">
                    {row.lastActivityAt ? new Date(row.lastActivityAt).toLocaleString(locale) : "—"}
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
