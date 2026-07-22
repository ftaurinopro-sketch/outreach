"use client";

import { useState } from "react";
import type { AgentConfig } from "@/lib/agents/types";
import type { ChatMessage } from "@/lib/claude";

const SAMPLE_PROSPECTS = [
  { firstName: "Matthew", lastName: "Davis", company: "Atlas Digital", jobTitle: "Business Development Director", location: "Chicago, Illinois" },
  { firstName: "Giulia", lastName: "Bianchi", company: "Nord Marketing Srl", jobTitle: "Head of Growth", location: "Milano, Italia" },
  { firstName: "Tom", lastName: "Reynolds", company: "Reynolds & Co", jobTitle: "Founder", location: "London, UK" },
  { firstName: "Sara", lastName: "Conti", company: "Vela Studio", jobTitle: "Marketing Manager", location: "Bologna, Italia" },
];

type Prospect = (typeof SAMPLE_PROSPECTS)[number];

const EMPTY_PROSPECT: Prospect = { firstName: "", lastName: "", company: "", jobTitle: "", location: "" };

export default function SandboxClient({
  agents,
  initialAgentId,
}: {
  agents: AgentConfig[];
  initialAgentId?: string;
}) {
  const [agentId, setAgentId] = useState(initialAgentId || agents[0]?.id);
  const [prospect, setProspect] = useState<Prospect>(EMPTY_PROSPECT);
  const [openingMessage, setOpeningMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function randomize() {
    const pick = SAMPLE_PROSPECTS[Math.floor(Math.random() * SAMPLE_PROSPECTS.length)];
    setProspect(pick);
  }

  function clearConversation() {
    setMessages([]);
    setError(null);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || !agentId || sending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/sandbox/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, prospect, history: nextMessages, openingMessage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nella risposta dell'agent");
      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore inatteso");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-neutral-500">AI Assistant</label>
          <select
            value={agentId}
            onChange={(e) => {
              setAgentId(e.target.value);
              clearConversation();
            }}
            className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-neutral-900">Prospect Settings</h3>
          <div className="flex gap-2">
            <button onClick={randomize} className="text-xs text-neutral-500 hover:text-neutral-900">
              Randomize
            </button>
            <button
              onClick={() => setProspect(EMPTY_PROSPECT)}
              className="text-xs text-neutral-500 hover:text-neutral-900"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <Field
              label="First Name"
              value={prospect.firstName}
              onChange={(v) => setProspect((p) => ({ ...p, firstName: v }))}
            />
            <Field
              label="Last Name"
              value={prospect.lastName}
              onChange={(v) => setProspect((p) => ({ ...p, lastName: v }))}
            />
          </div>
          <Field
            label="Company"
            value={prospect.company}
            onChange={(v) => setProspect((p) => ({ ...p, company: v }))}
          />
          <Field
            label="Job Title"
            value={prospect.jobTitle}
            onChange={(v) => setProspect((p) => ({ ...p, jobTitle: v }))}
          />
          <Field
            label="Location"
            value={prospect.location}
            onChange={(v) => setProspect((p) => ({ ...p, location: v }))}
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">
              AI&apos;s Opening Message (optional)
            </label>
            <textarea
              value={openingMessage}
              onChange={(e) => setOpeningMessage(e.target.value)}
              rows={2}
              placeholder="Il primo messaggio dell'agent, per simulare l'outreach reale..."
              className="w-full resize-none rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col rounded-lg border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2.5">
          <h3 className="text-sm font-medium text-neutral-900">Conversation</h3>
          <button onClick={clearConversation} className="text-xs text-neutral-500 hover:text-neutral-900">
            Clear
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" style={{ minHeight: 360 }}>
          {openingMessage && (
            <Bubble from="assistant">{openingMessage}</Bubble>
          )}
          {messages.length === 0 && !openingMessage && (
            <p className="text-sm text-neutral-400">
              Scrivi qui sotto &quot;come se fossi il prospect&quot; per iniziare la conversazione.
            </p>
          )}
          {messages.map((m, i) => (
            <Bubble key={i} from={m.role}>
              {m.content}
            </Bubble>
          ))}
          {sending && <Bubble from="assistant">...</Bubble>}
        </div>

        {error && <p className="px-4 pb-1 text-sm text-red-600">{error}</p>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-end gap-2 border-t border-neutral-200 p-3"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type as the prospect..."
            rows={1}
            className="flex-1 resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button
            type="submit"
            disabled={sending}
            className="shrink-0 rounded-md bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-500">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
      />
    </div>
  );
}

function Bubble({ from, children }: { from: "user" | "assistant"; children: React.ReactNode }) {
  return (
    <div className={`flex ${from === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg px-3.5 py-2 text-sm ${
          from === "user" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-800"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
