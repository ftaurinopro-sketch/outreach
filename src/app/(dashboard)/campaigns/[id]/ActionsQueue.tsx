import { getLocale, getTranslations } from "next-intl/server";
import type { AutomationAction } from "@/lib/automation/types";

export default async function ActionsQueue({ actions }: { actions: AutomationAction[] }) {
  const [t, locale] = await Promise.all([getTranslations("ActionsQueue"), getLocale()]);

  const statusLabel: Record<AutomationAction["status"], string> = {
    pending: t("status.pending"),
    in_progress: t("status.inProgress"),
    done: t("status.done"),
    failed: t("status.failed"),
    expired: t("status.expired"),
    cancelled: t("status.cancelled"),
  };
  const typeLabel: Record<AutomationAction["type"], string> = {
    send_connection_request: t("type.sendConnectionRequest"),
    check_acceptance: t("type.checkAcceptance"),
    send_message: t("type.sendMessage"),
    check_reply: t("type.checkReply"),
  };

  const counts = actions.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-900">{t("title")}</h3>
        <div className="flex gap-1.5 text-xs">
          {Object.entries(counts).map(([status, count]) => (
            <span key={status} className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600">
              {statusLabel[status as AutomationAction["status"]]}: {count}
            </span>
          ))}
        </div>
      </div>

      {actions.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-400">{t("empty")}</p>
      ) : (
        <div className="mt-3 max-h-80 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-neutral-400">
              <tr>
                <th className="pb-1 pr-3">{t("colLead")}</th>
                <th className="pb-1 pr-3">{t("colAction")}</th>
                <th className="pb-1 pr-3">{t("colStatus")}</th>
                <th className="pb-1">{t("colScheduled")}</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((a) => (
                <tr key={a.id} className="border-t border-neutral-100">
                  <td className="py-1.5 pr-3">{a.leadFirstName || a.leadLinkedinUrl}</td>
                  <td className="py-1.5 pr-3">{typeLabel[a.type]}</td>
                  <td className="py-1.5 pr-3">
                    {statusLabel[a.status]}
                    {a.lastError && (
                      <span className="ml-1 text-red-500" title={a.lastError}>
                        ⚠
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 text-neutral-400">
                    {new Date(a.scheduledAt).toLocaleString(locale)}
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
