import React, { useMemo, useState } from "react";
import { AiracCycleRecord, AiracStatus } from "../types";
import { TIMEZONE } from "../constants";
import { SegmentedTabs, SidebarCard } from "./ui/DesignSystem";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const SOURCE_TEAM_COLORS: Record<string, string> = {
  "Charts+Minima+Min+ENR": "#3b82f6",
  "NFP+NOTAM": "#8b5cf6",
  "AODB Data team": "#7c3aed",
  "NAV+": "#10b981",
  "OBST Team": "#06b6d4",
  "AIP Capture": "#f59e0b",
  Geo: "#ec4899",
};

type AnalyticsDrilldown =
  | { type: "team"; team: string }
  | { type: "month"; month: string }
  | null;

const formatDate = (dateISO: string) =>
  new Date(`${dateISO}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TIMEZONE,
  });

const statusBadgeClass = (status: AiracStatus) =>
  status === "AIRAC" ? "bg-indigo-600 text-white" : "bg-slate-500 text-white";

export const AiracInsights: React.FC<{
  records: AiracCycleRecord[];
  selectedYear: string;
  resolvedYear: string;
  availableYears: string[];
}> = ({ records, selectedYear, resolvedYear, availableYears }) => {
  const [selectedSourceTeam, setSelectedSourceTeam] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<AiracStatus | "ALL">(
    "ALL",
  );
  const [searchRevision, setSearchRevision] = useState("");
  const [activeTab, setActiveTab] = useState<"timeline" | "analytics">(
    "timeline",
  );
  const [analyticsDrilldown, setAnalyticsDrilldown] =
    useState<AnalyticsDrilldown>(null);

  const tabItems = [
    { id: "timeline", label: "Timeline" },
    { id: "analytics", label: "Analytics" },
  ] as const;

  const nowISO = useMemo(() => {
    const now = new Date(
      new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE }).format(
        new Date(),
      ),
    );
    return now.toISOString().split("T")[0];
  }, []);

  const sourceTeams = useMemo(() => {
    return Array.from(new Set(records.map((record) => record.sourceTeam))).sort(
      (left, right) => left.localeCompare(right),
    );
  }, [records]);

  const filtered = useMemo(() => {
    const revisionQuery = searchRevision.trim().toLowerCase();
    return records.filter((record) => {
      const teamMatch =
        selectedSourceTeam === "ALL" || record.sourceTeam === selectedSourceTeam;
      const statusMatch =
        selectedStatus === "ALL" || record.status === selectedStatus;
      const revisionMatch =
        revisionQuery.length === 0 ||
        record.revision.toLowerCase().includes(revisionQuery);
      return teamMatch && statusMatch && revisionMatch;
    });
  }, [records, selectedSourceTeam, selectedStatus, searchRevision]);

  const teamStats = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((record) => {
      counts[record.sourceTeam] = (counts[record.sourceTeam] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([team, count]) => ({ team, count }))
      .sort((left, right) => right.count - left.count);
  }, [filtered]);

  const monthStats = useMemo(() => {
    const counts = new Array(12).fill(0);
    filtered.forEach((record) => {
      const monthIndex = Number(record.startDateISO.slice(5, 7)) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        counts[monthIndex] += 1;
      }
    });
    return MONTHS.map((month, index) => ({ month, count: counts[index] }));
  }, [filtered]);

  const monthGroups = useMemo(() => {
    const buckets: Record<string, AiracCycleRecord[]> = {};
    MONTHS.forEach((month) => {
      buckets[month] = [];
    });
    filtered.forEach((record) => {
      const monthIndex = Number(record.startDateISO.slice(5, 7)) - 1;
      const monthName = MONTHS[monthIndex];
      if (monthName) {
        buckets[monthName].push(record);
      }
    });
    return MONTHS.map((month) => ({
      month,
      records: buckets[month].sort((left, right) =>
        left.startDateISO.localeCompare(right.startDateISO),
      ),
    }));
  }, [filtered]);

  const stats = useMemo(() => {
    const airacCount = filtered.filter((record) => record.status === "AIRAC").length;
    const nonAiracCount = filtered.filter(
      (record) => record.status === "NON-AIRAC",
    ).length;
    const activeNow = filtered.filter(
      (record) => record.startDateISO <= nowISO && record.closeoutDateISO >= nowISO,
    ).length;
    const trackedTeams = new Set(filtered.map((record) => record.sourceTeam)).size;
    return { airacCount, nonAiracCount, activeNow, trackedTeams };
  }, [filtered, nowISO]);

  const maxTeamCount = Math.max(...teamStats.map((item) => item.count), 1);
  const maxMonthCount = Math.max(...monthStats.map((item) => item.count), 1);
  const isFallbackYear = resolvedYear !== selectedYear;

  const drilldownRecords = useMemo(() => {
    if (!analyticsDrilldown) {
      return [];
    }

    if (analyticsDrilldown.type === "team") {
      return filtered
        .filter((record) => record.sourceTeam === analyticsDrilldown.team)
        .sort((left, right) => left.startDateISO.localeCompare(right.startDateISO));
    }

    const monthIndex = MONTHS.indexOf(analyticsDrilldown.month);
    if (monthIndex < 0) {
      return [];
    }

    return filtered
      .filter((record) => Number(record.startDateISO.slice(5, 7)) - 1 === monthIndex)
      .sort((left, right) => left.startDateISO.localeCompare(right.startDateISO));
  }, [analyticsDrilldown, filtered]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-80 flex-shrink-0">
          <div className="lg:sticky lg:top-24 space-y-4">
            <SidebarCard className="p-5">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-800">AIRAC Filters</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Read-only AIRAC cycles for {selectedYear}
                </p>
              </div>
              <div className="space-y-3">
                <select
                  value={selectedSourceTeam}
                  onChange={(event) => setSelectedSourceTeam(event.target.value)}
                  className="w-full bg-slate-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 border-none"
                >
                  <option value="ALL">All AIRAC Source Teams</option>
                  {sourceTeams.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(event) =>
                    setSelectedStatus(event.target.value as AiracStatus | "ALL")
                  }
                  className="w-full bg-slate-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 border-none"
                >
                  <option value="ALL">All Status</option>
                  <option value="AIRAC">AIRAC</option>
                  <option value="NON-AIRAC">NON-AIRAC</option>
                </select>

                <input
                  type="text"
                  value={searchRevision}
                  onChange={(event) => setSearchRevision(event.target.value)}
                  placeholder="Find revision..."
                  className="w-full bg-slate-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 border-none"
                />
              </div>
            </SidebarCard>
          </div>
        </aside>

        <section className="flex-1 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <SegmentedTabs tabs={tabItems} activeId={activeTab} onChange={setActiveTab} />
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700">
              AIRAC Cycles {resolvedYear}
            </span>
          </div>

          {isFallbackYear && (
            <div className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
              Requested AIRAC year {selectedYear} is unavailable; displaying {resolvedYear}.
              {availableYears.length > 0 &&
                ` Available years: ${availableYears.join(", ")}.`}
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {monthGroups.map((group) => (
                <div
                  key={group.month}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200"
                >
                  <h3 className="text-sm font-bold text-slate-700 mb-4">
                    {group.month}
                  </h3>
                  <div className="space-y-2 max-h-[340px] overflow-y-auto no-scrollbar pr-1">
                    {group.records.length === 0 && (
                      <div className="text-[11px] text-slate-400 italic py-3">
                        No records
                      </div>
                    )}
                    {group.records.map((record, index) => (
                      <div
                        key={`${record.sourceTeam}-${record.revision}-${index}`}
                        className="rounded-xl border border-slate-100 bg-slate-50/80 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor:
                                    SOURCE_TEAM_COLORS[record.sourceTeam] || "#94a3b8",
                                }}
                              />
                              <p className="text-[11px] font-bold text-slate-700">
                                {record.sourceTeam}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${statusBadgeClass(record.status)}`}
                          >
                            {record.status}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-slate-900">
                          <span>Rev {record.revision}</span>
                          <span>{record.cycleLength ?? "-"} days</span>
                        </div>
                        <div className="mt-1 text-[10px] font-bold text-slate-900">
                          {formatDate(record.startDateISO)} -{" "}
                          {formatDate(record.closeoutDateISO)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 p-4 rounded-2xl">
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                    AIRAC
                  </p>
                  <p className="text-2xl font-black text-indigo-600">
                    {stats.airacCount}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-2xl">
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                    NON-AIRAC
                  </p>
                  <p className="text-2xl font-black text-slate-700">
                    {stats.nonAiracCount}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-2xl">
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Active Today
                  </p>
                  <p className="text-2xl font-black text-blue-600">
                    {stats.activeNow}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-2xl">
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Teams
                  </p>
                  <p className="text-2xl font-black">{stats.trackedTeams}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1 h-6 bg-blue-600 rounded-full" />
                  <h3 className="text-lg font-bold text-slate-800">
                    Revisions by AIRAC Source Team
                  </h3>
                </div>
                <div className="space-y-4">
                  {teamStats.length === 0 && (
                    <p className="text-sm text-slate-400 italic">
                      No team data for selected filters.
                    </p>
                  )}
                  {teamStats.map((item) => (
                    <button
                      key={item.team}
                      onClick={() =>
                        setAnalyticsDrilldown({ type: "team", team: item.team })
                      }
                      type="button"
                      className="w-full text-left space-y-1 group"
                    >
                      <div className="flex justify-between text-xs font-semibold text-slate-600">
                        <span>{item.team}</span>
                        <span>{item.count} revisions</span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-700 group-hover:opacity-85"
                          style={{
                            width: `${(item.count / maxTeamCount) * 100}%`,
                            backgroundColor:
                              SOURCE_TEAM_COLORS[item.team] || "#6366f1",
                          }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
                {teamStats.length > 0 && (
                  <p className="mt-4 text-[11px] font-semibold text-slate-500">
                    Click a team bar to open detailed revisions.
                  </p>
                )}
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1 h-6 bg-indigo-600 rounded-full" />
                  <h3 className="text-lg font-bold text-slate-800">
                    Monthly Revision Distribution
                  </h3>
                </div>
                <div className="flex items-end justify-between h-44 gap-2 px-2">
                  {monthStats.map((item) => (
                    <button
                      key={item.month}
                      type="button"
                      onClick={() =>
                        setAnalyticsDrilldown({ type: "month", month: item.month })
                      }
                      className="flex-1 flex flex-col items-center gap-2 group"
                    >
                      <div className="relative w-full flex justify-center">
                        <div className="absolute -top-8 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {item.count} records
                        </div>
                        <div
                          className="w-full max-w-[32px] bg-indigo-500 rounded-t-lg transition-all duration-700 ease-out group-hover:bg-indigo-400"
                          style={{
                            height: `${(item.count / maxMonthCount) * 140}px`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {item.month}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-[11px] font-semibold text-slate-500">
                  Click a month bar to inspect that month&apos;s revisions.
                </p>
              </div>

              {analyticsDrilldown && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                        Graph Details
                      </p>
                      <h4 className="text-lg font-bold text-slate-900 mt-1">
                        {analyticsDrilldown.type === "team"
                          ? `${analyticsDrilldown.team} Revisions`
                          : `${analyticsDrilldown.month} Revisions`}
                      </h4>
                    </div>
                    <button
                      onClick={() => setAnalyticsDrilldown(null)}
                      type="button"
                      className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors"
                    >
                      Clear
                    </button>
                  </div>

                  {drilldownRecords.length === 0 ? (
                    <p className="text-sm font-medium text-slate-500">
                      No records for this selection.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[320px] overflow-y-auto no-scrollbar pr-1">
                      {drilldownRecords.map((record, index) => (
                        <div
                          key={`${record.sourceTeam}-${record.revision}-${record.startDateISO}-${index}`}
                          className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-slate-900">
                                {record.sourceTeam}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${statusBadgeClass(record.status)}`}
                            >
                              {record.status}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-700">
                            <span>Rev {record.revision}</span>
                            <span>{record.cycleLength ?? "-"} days</span>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-slate-700">
                            {formatDate(record.startDateISO)} -{" "}
                            {formatDate(record.closeoutDateISO)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

