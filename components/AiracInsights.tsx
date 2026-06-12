import React, { useEffect, useMemo, useState } from "react";
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

const FULL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SOURCE_TEAM_COLORS: Record<string, string> = {
  "Charts+Minima+Min+ENR": "#2563eb", // strong blue
  "NFP+NOTAM": "#7c3aed", // violet
  "AODB Data team": "#dc2626", // red
  "NAV+": "#059669", // emerald
  "OBST Team": "#0891b2", // teal
  "AIP Capture": "#f59e0b", // amber
  Geo: "#db2777", // pink
};

const FALLBACK_TEAM_COLORS = [
  "#2563eb",
  "#f59e0b",
  "#059669",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#475569",
];

type CalendarMarkerKind = "CYCLE_END";

interface CalendarMarker {
  dateISO: string;
  kind: CalendarMarkerKind;
  record: AiracCycleRecord;
}

const formatDate = (dateISO: string) =>
  new Date(`${dateISO}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TIMEZONE,
  });

const statusBadgeClass = (status: AiracStatus) =>
  status === "AIRAC" ? "bg-indigo-600 text-white" : "bg-slate-500 text-white";

const getTeamColor = (team: string, teams: string[]) => {
  if (SOURCE_TEAM_COLORS[team]) {
    return SOURCE_TEAM_COLORS[team];
  }
  const index = Math.max(0, teams.indexOf(team));
  return FALLBACK_TEAM_COLORS[index % FALLBACK_TEAM_COLORS.length];
};

const getDaysInMonth = (year: number, monthIndex: number) =>
  new Date(year, monthIndex + 1, 0).getDate();

const getFirstWeekdayOffset = (year: number, monthIndex: number) =>
  new Date(year, monthIndex, 1).getDay();

const markerLabel = () => "Cycle End / Closeout";

const buildMarkers = (records: AiracCycleRecord[]) =>
  records.map((record): CalendarMarker => ({
    dateISO: record.closeoutDateISO,
    kind: "CYCLE_END",
    record,
  }));

export const AiracInsights: React.FC<{
  records: AiracCycleRecord[];
  selectedYear: string;
  resolvedYear: string;
  availableYears: string[];
}> = ({ records, selectedYear, resolvedYear, availableYears }) => {
  const [selectedStatus, setSelectedStatus] = useState<AiracStatus | "ALL">(
    "ALL",
  );
  const [searchRevision, setSearchRevision] = useState("");
  const [activeTab, setActiveTab] = useState<"timeline" | "calendar">(
    "timeline",
  );
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(
    null,
  );
  const [selectedCalendarTeams, setSelectedCalendarTeams] = useState<string[]>([]);

  const tabItems = [
    { id: "timeline", label: "Timeline" },
    { id: "calendar", label: "AIRAC Calendar" },
  ] as const;

  const sourceTeams = useMemo(() => {
    return Array.from(new Set(records.map((record) => record.sourceTeam))).sort(
      (left, right) => left.localeCompare(right),
    );
  }, [records]);

  useEffect(() => {
    setSelectedCalendarTeams((previousTeams) => {
      const availableTeams = new Set(sourceTeams);
      const keptTeams = previousTeams.filter((team) => availableTeams.has(team));

      if (previousTeams.length === 0) {
        return sourceTeams;
      }

      if (
        keptTeams.length === previousTeams.length &&
        keptTeams.length === sourceTeams.length
      ) {
        return previousTeams;
      }

      return keptTeams;
    });
  }, [sourceTeams]);

  const toggleCalendarTeam = (team: string) => {
    setSelectedCalendarTeams((previousTeams) =>
      previousTeams.includes(team)
        ? previousTeams.filter((selectedTeam) => selectedTeam !== team)
        : [...previousTeams, team],
    );
  };

  const filtered = useMemo(() => {
    const revisionQuery = searchRevision.trim().toLowerCase();
    return records.filter((record) => {
      const statusMatch =
        selectedStatus === "ALL" || record.status === selectedStatus;
      const revisionMatch =
        revisionQuery.length === 0 ||
        record.revision.toLowerCase().includes(revisionQuery);
      return statusMatch && revisionMatch;
    });
  }, [records, selectedStatus, searchRevision]);

  const calendarFilteredRecords = useMemo(() => {
    if (selectedCalendarTeams.length === 0) {
      return [];
    }

    const selectedTeamSet = new Set(selectedCalendarTeams);
    return filtered.filter((record) => selectedTeamSet.has(record.sourceTeam));
  }, [filtered, selectedCalendarTeams]);

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

  const calendarYear = Number(resolvedYear) || new Date().getFullYear();

  const calendarMarkersByDate = useMemo(() => {
    const buckets: Record<string, CalendarMarker[]> = {};
    buildMarkers(calendarFilteredRecords).forEach((marker) => {
      buckets[marker.dateISO] = [...(buckets[marker.dateISO] || []), marker];
    });
    Object.values(buckets).forEach((markers) => {
      markers.sort((left, right) => {
        const dateOrder = left.dateISO.localeCompare(right.dateISO);
        if (dateOrder !== 0) return dateOrder;
        const teamOrder = left.record.sourceTeam.localeCompare(right.record.sourceTeam);
        if (teamOrder !== 0) return teamOrder;
        return markerLabel(left.kind).localeCompare(markerLabel(right.kind));
      });
    });
    return buckets;
  }, [calendarFilteredRecords]);

  const selectedMonthRecords = useMemo(() => {
    if (selectedMonthIndex === null) {
      return [];
    }
    return calendarFilteredRecords
      .filter((record) => {
        const endMonth = Number(record.closeoutDateISO.slice(5, 7)) - 1;
        return endMonth === selectedMonthIndex;
      })
      .sort((left, right) => {
        const dateOrder = left.startDateISO.localeCompare(right.startDateISO);
        if (dateOrder !== 0) return dateOrder;
        return left.sourceTeam.localeCompare(right.sourceTeam);
      });
  }, [calendarFilteredRecords, selectedMonthIndex]);

  const isFallbackYear = resolvedYear !== selectedYear;

  const renderCalendarMarker = (marker: CalendarMarker, index: number) => {
    const color = getTeamColor(marker.record.sourceTeam, sourceTeams);
    return (
      <span
        key={`${marker.record.sourceTeam}-${marker.record.revision}-${marker.kind}-${index}`}
        className="h-2.5 w-2.5 rounded-full border"
        style={{
          backgroundColor: color,
          borderColor: color,
        }}
        title={`${marker.record.sourceTeam} ${marker.record.revision} ${markerLabel()}`}
      />
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-80 flex-shrink-0">
          <div className="lg:sticky lg:top-24 space-y-3">
            <SidebarCard className="p-4">
              <div className="mb-3">
                <h3 className="text-base font-bold text-slate-800">AIRAC Filters</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Status and revision filters for {selectedYear}
                </p>
              </div>
              <div className="space-y-2">
                <select
                  value={selectedStatus}
                  onChange={(event) =>
                    setSelectedStatus(event.target.value as AiracStatus | "ALL")
                  }
                  className="w-full bg-slate-100 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 border-none"
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
                  className="w-full bg-slate-100 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 border-none"
                />
              </div>
            </SidebarCard>

            {activeTab === "calendar" && (
              <SidebarCard className="p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Filter by Team</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Select teams to show their calendar dates.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCalendarTeams(sourceTeams)}
                    className="flex-1 rounded-xl bg-slate-900 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-white hover:bg-slate-800 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCalendarTeams([])}
                    className="flex-1 rounded-xl bg-slate-100 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    Clear All
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Teams
                    </p>
                    <span className="text-[10px] font-bold text-slate-400">
                      {selectedCalendarTeams.length}/{sourceTeams.length} selected
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                    {sourceTeams.map((team) => {
                      const isSelected = selectedCalendarTeams.includes(team);
                      const teamColor = getTeamColor(team, sourceTeams);

                      return (
                        <button
                          key={team}
                          type="button"
                          onClick={() => toggleCalendarTeam(team)}
                          className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-left text-[11px] transition-all ${
                            isSelected
                              ? "border-slate-200 bg-white font-black text-slate-800 shadow-sm"
                              : "border-slate-100 bg-slate-50 font-bold text-slate-400 opacity-60"
                          }`}
                        >
                          <span
                            className="h-2 w-2 rounded-full border flex-shrink-0"
                            style={{
                              backgroundColor: isSelected ? teamColor : "transparent",
                              borderColor: teamColor,
                            }}
                          />
                          <span className="truncate">{team}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Date Marks
                  </p>
                  <div className="space-y-1.5 text-[10px] font-semibold text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-700 border border-slate-700 flex-shrink-0" />
                      <span>Cycle end / closeout date only</span>
                    </div>
                    <p className="text-[9px] leading-snug text-slate-400">
                      Date ranges are shown inside the month details popup.
                    </p>
                  </div>
                </div>
              </SidebarCard>
            )}
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
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: getTeamColor(record.sourceTeam, sourceTeams),
                              }}
                            />
                            <p className="text-[11px] font-bold text-slate-700">
                              {record.sourceTeam}
                            </p>
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
                          {formatDate(record.startDateISO)} - {" "}
                          {formatDate(record.closeoutDateISO)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "calendar" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      {resolvedYear} AIRAC Calendar
                    </h2>
                    <p className="text-xs font-medium text-slate-500">
                      Click any month to view cycle details grouped by AIRAC and Non-AIRAC.
                    </p>
                  </div>
                  <p className="text-[11px] font-bold text-slate-500">
                    Showing {calendarFilteredRecords.length} cycles and {buildMarkers(calendarFilteredRecords).length} date marks
                  </p>
                </div>
              </div>

              {selectedCalendarTeams.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm font-semibold text-slate-400">
                  No teams selected. Select one or more teams from the legend to view calendar dates.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {MONTHS.map((month, monthIndex) => {
                  const daysInMonth = getDaysInMonth(calendarYear, monthIndex);
                  const offset = getFirstWeekdayOffset(calendarYear, monthIndex);
                  const cells = [
                    ...Array.from({ length: offset }, (_, index) => ({
                      type: "blank" as const,
                      key: `blank-${index}`,
                    })),
                    ...Array.from({ length: daysInMonth }, (_, index) => {
                      const day = index + 1;
                      const dateISO = `${calendarYear}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      return { type: "day" as const, key: dateISO, day, dateISO };
                    }),
                  ];
                  const monthMarkerCount = cells.reduce((count, cell) => {
                    if (cell.type !== "day") return count;
                    return count + (calendarMarkersByDate[cell.dateISO]?.length || 0);
                  }, 0);

                  return (
                    <button
                      key={month}
                      type="button"
                      onClick={() => setSelectedMonthIndex(monthIndex)}
                      className="text-left rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <h3 className="text-sm font-black text-slate-800">
                          {FULL_MONTHS[monthIndex]}
                        </h3>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">
                          {monthMarkerCount} marks
                        </span>
                      </div>

                      <div className="grid grid-cols-7 gap-1 mb-1">
                        {WEEKDAYS.map((weekday) => (
                          <div
                            key={weekday}
                            className="text-center text-[9px] font-black uppercase text-slate-400"
                          >
                            {weekday.slice(0, 1)}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-1">
                        {cells.map((cell) => {
                          if (cell.type === "blank") {
                            return <div key={cell.key} className="min-h-[42px]" />;
                          }
                          const markers = calendarMarkersByDate[cell.dateISO] || [];
                          const visibleMarkers = markers.slice(0, 4);
                          const hiddenCount = Math.max(0, markers.length - visibleMarkers.length);
                          return (
                            <div
                              key={cell.key}
                              className={`min-h-[42px] rounded-lg border p-1 ${
                                markers.length
                                  ? "border-indigo-100 bg-indigo-50/40"
                                  : "border-slate-100 bg-slate-50/40"
                              }`}
                            >
                              <div className="text-[10px] font-black text-slate-600">
                                {cell.day}
                              </div>
                              <div className="mt-1 flex flex-wrap gap-0.5">
                                {visibleMarkers.map(renderCalendarMarker)}
                                {hiddenCount > 0 && (
                                  <span className="text-[8px] font-black text-slate-500">
                                    +{hiddenCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      {selectedMonthIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
          <div className="max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-indigo-500">
                  Month Details
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">
                  {FULL_MONTHS[selectedMonthIndex]} {resolvedYear}
                </h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  One row shows one complete cycle: team, revision, and date range.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMonthIndex(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>

            <div className="max-h-[68vh] overflow-y-auto p-5 space-y-6">
              {(["AIRAC", "NON-AIRAC"] as AiracStatus[]).map((status) => {
                const group = selectedMonthRecords.filter(
                  (record) => record.status === status,
                );
                const teamGroups = Array.from(
                  group
                    .reduce((buckets, record) => {
                      const teamRecords = buckets.get(record.sourceTeam) || [];
                      teamRecords.push(record);
                      buckets.set(record.sourceTeam, teamRecords);
                      return buckets;
                    }, new Map<string, AiracCycleRecord[]>())
                    .entries(),
                )
                  .map(([team, teamRecords]) => ({
                    team,
                    records: teamRecords.sort((left, right) =>
                      left.startDateISO.localeCompare(right.startDateISO),
                    ),
                  }))
                  .sort((left, right) => left.team.localeCompare(right.team));

                return (
                  <section key={status}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-black text-slate-800">
                        {status === "AIRAC" ? "AIRAC Cycles" : "Non-AIRAC Cycles"}
                      </h3>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                          status === "AIRAC"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {group.length} cycles
                      </span>
                    </div>

                    {group.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-400">
                        No {status === "AIRAC" ? "AIRAC" : "Non-AIRAC"} cycles found for the selected team filter in this month.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {teamGroups.map(({ team, records }) => (
                          <div
                            key={`${status}-${team}`}
                            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                          >
                            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                              <div className="flex min-w-0 items-center gap-2">
                                <span
                                  className="h-3 w-3 flex-shrink-0 rounded-full"
                                  style={{
                                    backgroundColor: getTeamColor(team, sourceTeams),
                                  }}
                                />
                                <h4 className="truncate text-sm font-black text-slate-800">
                                  {team}
                                </h4>
                              </div>
                              <span className="flex-shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-slate-500 shadow-sm ring-1 ring-slate-200">
                                {records.length} {records.length === 1 ? "cycle" : "cycles"}
                              </span>
                            </div>

                            <div className="divide-y divide-slate-100">
                              {records.map((record, index) => (
                                <div
                                  key={`${record.sourceTeam}-${record.revision}-${record.startDateISO}-${index}`}
                                  className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[120px_1fr_80px] sm:items-center"
                                >
                                  <div className="font-black text-slate-700">
                                    Rev {record.revision}
                                  </div>
                                  <div className="font-semibold text-slate-600">
                                    {formatDate(record.startDateISO)} → {formatDate(record.closeoutDateISO)}
                                  </div>
                                  <div className="font-semibold text-slate-500 sm:text-right">
                                    {record.cycleLength ?? "-"} days
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}

              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-xs font-semibold text-indigo-700">
                Calendar rule: color = team, filled mark = cycle end / closeout date. Full date ranges are shown in this popup.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
