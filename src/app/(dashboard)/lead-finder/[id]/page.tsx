import { notFound } from "next/navigation";
import { getLeadList } from "@/lib/leads/store";
import DeleteListButton from "./DeleteListButton";

type Props = { params: Promise<{ id: string }> };

export default async function LeadListPage({ params }: Props) {
  const { id } = await params;
  const list = await getLeadList(id);
  if (!list) notFound();

  return (
    <div className="max-w-4xl px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{list.name}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {list.leads.length} lead · importati il{" "}
            {new Date(list.createdAt).toLocaleDateString("it-IT")}
          </p>
        </div>
        <DeleteListButton listId={list.id} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 text-xs text-neutral-400">
            <tr>
              <th className="px-4 py-2.5">Nome</th>
              <th className="px-4 py-2.5">Headline</th>
              <th className="px-4 py-2.5">Azienda</th>
              <th className="px-4 py-2.5">Posizione</th>
              <th className="px-4 py-2.5">Località</th>
              <th className="px-4 py-2.5">LinkedIn</th>
            </tr>
          </thead>
          <tbody>
            {list.leads.map((lead, i) => (
              <tr key={i} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-2.5">
                  {lead.firstName} {lead.lastName}
                </td>
                <td className="max-w-[220px] truncate px-4 py-2.5 text-neutral-500">
                  {lead.headline}
                </td>
                <td className="px-4 py-2.5">{lead.company}</td>
                <td className="px-4 py-2.5">{lead.position}</td>
                <td className="px-4 py-2.5">{lead.location}</td>
                <td className="px-4 py-2.5">
                  <a
                    href={lead.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-neutral-500 hover:text-neutral-900 hover:underline"
                  >
                    Profilo →
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
