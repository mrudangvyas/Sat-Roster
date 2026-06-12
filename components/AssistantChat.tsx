import React, { useEffect, useRef, useState } from "react";
import { ScheduleData } from "../types";

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
}

interface AssistantChatProps {
  data: ScheduleData;
  scopeTeams: string[];
}

export const AssistantChat: React.FC<AssistantChatProps> = ({
  data,
  scopeTeams,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi. Ask me about a Saturday using formats like 2026-03-21, 21/03/2026, 21-Mar-2026, or Mar 21 2026 and I will summarize working/off teams.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);


  const parseDateQuery = (query: string) => {
    const monthLookup: Record<string, string> = {
      jan: "01",
      january: "01",
      feb: "02",
      february: "02",
      mar: "03",
      march: "03",
      apr: "04",
      april: "04",
      may: "05",
      jun: "06",
      june: "06",
      jul: "07",
      july: "07",
      aug: "08",
      august: "08",
      sep: "09",
      sept: "09",
      september: "09",
      oct: "10",
      october: "10",
      nov: "11",
      november: "11",
      dec: "12",
      december: "12",
    };

    const normalizeYear = (value: string) => {
      if (value.length === 2) {
        return `20${value}`;
      }
      return value;
    };

    const toISO = (yearValue: string, monthValue: string, dayValue: string) => {
      const year = normalizeYear(yearValue);
      const month = monthValue.padStart(2, "0");
      const day = dayValue.padStart(2, "0");
      const candidate = `${year}-${month}-${day}`;
      const parsed = new Date(`${candidate}T00:00:00Z`);

      if (
        Number.isNaN(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== candidate
      ) {
        return null;
      }

      return candidate;
    };

    const isoMatch = query.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return toISO(year, month, day);
    }

    const dayFirstNumericMatch = query.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
    if (dayFirstNumericMatch) {
      const [, day, month, year] = dayFirstNumericMatch;
      return toISO(year, month, day);
    }

    const dayMonthNameMatch = query.match(
      /\b(\d{1,2})(?:st|nd|rd|th)?[\s-]+([a-zA-Z]{3,9})[\s,-]+(\d{2,4})\b/,
    );
    if (dayMonthNameMatch) {
      const [, day, monthName, year] = dayMonthNameMatch;
      const month = monthLookup[monthName.toLowerCase()];
      if (month) {
        return toISO(year, month, day);
      }
    }

    const monthNameDayMatch = query.match(
      /\b([a-zA-Z]{3,9})[\s-]+(\d{1,2})(?:st|nd|rd|th)?[\s,-]+(\d{2,4})\b/,
    );
    if (monthNameDayMatch) {
      const [, monthName, day, year] = monthNameDayMatch;
      const month = monthLookup[monthName.toLowerCase()];
      if (month) {
        return toISO(year, month, day);
      }
    }

    return null;
  };

  const resolveQuery = (query: string) => {
    const scopedTeams = scopeTeams.filter((team) => data.teams.includes(team));
    if (scopedTeams.length === 0) {
      return "No teams are selected. Select at least one team to analyze schedule details.";
    }

    const dateISO = parseDateQuery(query);
    if (dateISO) {
      const record = data.records.find((r) => r.dateISO === dateISO);
      if (!record) {
        return `No roster record found for ${dateISO}. Try another Saturday in ${data.records[0]?.year || "the loaded year"}.`;
      }

      const workingTeams = scopedTeams.filter(
        (team) => record.teams[team] === "WORKING",
      );
      const offTeams = scopedTeams.filter((team) => record.teams[team] === "OFF");
      return [
        `${dateISO} summary:`,
        `Working (${workingTeams.length}/${scopedTeams.length}): ${workingTeams.join(", ") || "None"}`,
        `Off (${offTeams.length}/${scopedTeams.length}): ${offTeams.join(", ") || "None"}`,
      ].join("\n");
    }

    const normalized = query.toLowerCase();
    if (normalized.includes("next saturday") || normalized.includes("next")) {
      const todayISO = new Date().toISOString().split("T")[0];
      const next = data.records.find((r) => r.dateISO >= todayISO);
      if (!next) {
        return "No future Saturday found in the loaded data.";
      }
      const working = scopedTeams.filter((team) => next.teams[team] === "WORKING");
      return [
        `Next Saturday in dataset: ${next.dateISO}`,
        `Working teams (${working.length}/${scopedTeams.length}): ${working.join(", ") || "None"}`,
      ].join("\n");
    }

    if (normalized.includes("summary") || normalized.includes("coverage")) {
      const totalWorking = data.records.reduce((count, record) => {
        return (
          count +
          scopedTeams.filter((team) => record.teams[team] === "WORKING").length
        );
      }, 0);
      const totalSlots = data.records.length * scopedTeams.length;
      const pct = totalSlots ? ((totalWorking / totalSlots) * 100).toFixed(1) : "0.0";
      return `Coverage for selected teams: ${pct}% (${totalWorking}/${totalSlots} working slots).`;
    }

    return [
      "I can help with:",
      "- Date lookup: 2026-03-21, 21/03/2026, 21-Mar-2026, Mar 21 2026",
      "- Next date: next saturday",
      "- Coverage: summary",
    ].join("\n");
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 300));
    const response = resolveQuery(userMsg);

    setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    setIsLoading(false);
  };

  return (
    <div className="fixed bottom-10 right-6 z-50 print:hidden">
      {isOpen ? (
        <div className="bg-white w-80 md:w-96 h-[500px] shadow-2xl rounded-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="font-semibold text-sm">Schedule Assistant</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
              type="button"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 no-scrollbar"
          >
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                    message.role === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-white text-slate-700 border border-slate-200 rounded-bl-none shadow-sm"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex gap-1">
                  <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" />
                  <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-200 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleSend()}
                placeholder="Try 2026-03-21, 21-Mar-2026, next saturday..."
                className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2 text-xs focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              />
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md"
                type="button"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-slate-900/55 text-white p-4 rounded-full shadow-xl backdrop-blur-md border border-white/20 hover:bg-slate-900/75 hover:scale-105 transition-all flex items-center gap-2 active:scale-95"
          type="button"
        >
          <span className="font-semibold text-sm px-1">Ask Assistant</span>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </button>
      )}
    </div>
  );
};
