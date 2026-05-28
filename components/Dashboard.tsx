import React, { useMemo, useState } from "react";
import { Users } from "lucide-react";
import { APP_CONFIG, TIMEZONE } from "../constants";
import { ScheduleData, ScheduleRecord } from "../types";
import { TeamCalendar } from "./TeamCalendar";
import { SectionCard } from "./ui/DesignSystem";

interface DashboardProps {
  data: ScheduleData;
  selectedYear: string;
  onViewDetail: (record: ScheduleRecord) => void;
  isEnhancedMode?: boolean;
  onSelectMonth?: (month: string) => void;
  onFocusTeam?: (teamName: string) => void;
  compareSnapshot?: {
    compareYear: string;
    coverageDelta: number;
    heavyDelta: number;
  } | null;
  upcomingAiracConflicts?: Array<{
    dateISO: string;
    starts: number;
    closeouts: number;
    workingTeams: number;
  }>;
}

type LoadTone = {
  badgeClass: string;
  ringColor: string;
};

const LOAD_TONES: Record<"Heavy" | "Medium" | "Light", LoadTone> = {
  Heavy: {
    badgeClass: "bg-emerald-100 text-emerald-700",
    ringColor: "#10b981",
  },
  Medium: {
    badgeClass: "bg-amber-100 text-amber-700",
    ringColor: "#f59e0b",
  },
  Light: {
    badgeClass: "bg-rose-100 text-rose-700",
    ringColor: "#f43f5e",
  },
};

export const Dashboard: React.FC<DashboardProps> = ({
  data,
  selectedYear,
  onViewDetail,
  isEnhancedMode = false,
  onSelectMonth,
  onFocusTeam,
  compareSnapshot,
  upcomingAiracConflicts = [],
}) => {
  const [activeTeamCalendar, setActiveTeamCalendar] = useState<string | null>(null);
  const now = new Date(
    new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE }).format(new Date()),
  );
  const nowISO = now.toISOString().split("T")[0];

  const nextShiftCards = useMemo(() => {
    return data.records
      .filter((record) => record.dateISO >= nowISO)
      .slice(0, 5)
      .map((record) => {
        const workingTeams = data.teams.filter((team) => record.teams[team] === "WORKING");
        const count = workingTeams.length;
        let load: "Heavy" | "Medium" | "Light" = "Light";

        if (count >= APP_CONFIG.LOAD_THRESHOLDS.HEAVY) {
          load = "Heavy";
        } else if (count >= APP_CONFIG.LOAD_THRESHOLDS.MEDIUM) {
          load = "Medium";
        }

        return { ...record, workingTeams, count, load };
      });
  }, [data, nowISO]);

  const monthLoad = useMemo(() => {
    return data.months.map((month) => {
      const monthlyRecords = data.records.filter((record) => record.month === month);
      const totalWorking = monthlyRecords.reduce((sum, record) => {
        return (
          sum +
          data.teams.filter((team) => record.teams[team] === "WORKING").length
        );
      }, 0);
      return {
        month,
        totalWorking,
      };
    });
  }, [data]);

  const maxTeamTotal = Math.max(...data.stats.map((stat) => stat.totalWorking), 1);
  const maxMonthLoad = Math.max(...monthLoad.map((item) => item.totalWorking), 1);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            Live Console
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">Saturday Coverage</h2>
          <p className="text-sm text-slate-500 mt-1">
            Operational view for the {selectedYear} roster with team availability and next active dates.
          </p>
        </div>
      </section>

      {isEnhancedMode && (compareSnapshot || upcomingAiracConflicts.length > 0) && (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {compareSnapshot && (
            <SectionCard className="p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                Year Compare ({compareSnapshot.compareYear} vs {selectedYear})
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Coverage Delta
                  </p>
                  <p
                    className={`text-xl font-black mt-1 ${
                      compareSnapshot.coverageDelta >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {compareSnapshot.coverageDelta >= 0 ? "+" : ""}
                    {compareSnapshot.coverageDelta.toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Heavy Delta
                  </p>
                  <p
                    className={`text-xl font-black mt-1 ${
                      compareSnapshot.heavyDelta <= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {compareSnapshot.heavyDelta >= 0 ? "+" : ""}
                    {compareSnapshot.heavyDelta}
                  </p>
                </div>
              </div>
            </SectionCard>
          )}

          {upcomingAiracConflicts.length > 0 && (
            <SectionCard className="p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                AIRAC Conflict Detector
              </p>
              <div className="mt-3 space-y-2 max-h-[170px] overflow-y-auto no-scrollbar pr-1">
                {upcomingAiracConflicts.slice(0, 4).map((conflict) => (
                  <button
                    key={conflict.dateISO}
                    onClick={() => {
                      const matched = data.records.find(
                        (record) => record.dateISO === conflict.dateISO,
                      );
                      if (matched) {
                        onViewDetail(matched);
                      }
                    }}
                    type="button"
                    className="w-full text-left rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 hover:border-amber-200 hover:bg-amber-50 transition-colors"
                  >
                    <p className="text-sm font-bold text-slate-900">{conflict.dateISO}</p>
                    <p className="text-[11px] font-semibold text-slate-600">
                      Starts {conflict.starts} • Closeouts {conflict.closeouts} • Working{" "}
                      {conflict.workingTeams}
                    </p>
                  </button>
                ))}
              </div>
            </SectionCard>
          )}
        </section>
      )}

      {isEnhancedMode && (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SectionCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-blue-600 rounded-full" />
              <h3 className="text-base font-bold text-slate-800">Team Workload Distribution</h3>
            </div>
            <div className="space-y-3">
              {data.stats.map((stat) => (
                <button
                  key={stat.teamName}
                  onClick={() => {
                    setActiveTeamCalendar(stat.teamName);
                    onFocusTeam?.(stat.teamName);
                  }}
                  type="button"
                  className="w-full text-left group"
                >
                  <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                    <span>{stat.teamName}</span>
                    <span>{stat.totalWorking}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 group-hover:bg-blue-500 transition-colors"
                      style={{ width: `${(stat.totalWorking / maxTeamTotal) * 100}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-4 text-[11px] font-semibold text-slate-500">
              Click a team bar to focus that team and open matrix view.
            </p>
          </SectionCard>

          <SectionCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-indigo-600 rounded-full" />
              <h3 className="text-base font-bold text-slate-800">Monthly Load Curve</h3>
            </div>
            <div className="flex items-end gap-2 h-44">
              {monthLoad.map((item) => (
                <button
                  key={item.month}
                  onClick={() => onSelectMonth?.(item.month)}
                  type="button"
                  className="flex-1 flex flex-col items-center gap-2 group"
                >
                  <div
                    className="w-full max-w-[30px] rounded-t-md bg-indigo-500 group-hover:bg-indigo-400 transition-colors"
                    style={{ height: `${Math.max(10, (item.totalWorking / maxMonthLoad) * 130)}px` }}
                  />
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    {item.month.slice(0, 3)}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-4 text-[11px] font-semibold text-slate-500">
              Click a month bar to apply month filter on dashboard.
            </p>
          </SectionCard>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-blue-600 rounded-full" />
          <h3 className="text-lg font-bold text-slate-800">Upcoming 5 Saturdays</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {nextShiftCards.map((shift) => {
            const capacityPct = data.teams.length ? (shift.count / data.teams.length) * 100 : 0;
            const tone = LOAD_TONES[shift.load];

            return (
              <SectionCard
                key={shift.dateISO}
                className="p-4 cursor-pointer hover:shadow-lg hover:border-blue-200 transition-all"
              >
                <button onClick={() => onViewDetail(shift)} type="button" className="w-full text-left">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {shift.month}
                      </p>
                      <p className="text-4xl leading-none font-black text-slate-900 mt-1">
                        {shift.dateISO.split("-")[2]}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${tone.badgeClass}`}
                    >
                      {shift.load}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-col items-center">
                    <div
                      className="relative w-16 h-16 rounded-full shadow-inner"
                      style={{
                        background: `conic-gradient(${tone.ringColor} ${capacityPct}%, #e2e8f0 ${capacityPct}% 100%)`,
                      }}
                    >
                      <div className="absolute inset-[6px] rounded-full bg-white flex items-center justify-center">
                        <span className="text-lg font-black text-slate-800">
                          {capacityPct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <span className="mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Availability
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {shift.workingTeams.map((team) => (
                      <span
                        key={team}
                        className="px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600"
                      >
                        {team}
                      </span>
                    ))}
                  </div>
                </button>
              </SectionCard>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {data.stats.map((stat) => {
          return (
            <SectionCard
              key={stat.teamName}
              className="p-6 hover:shadow-md hover:border-blue-200 transition-all"
            >
              <div className="min-w-0">
                <button
                  onClick={() => setActiveTeamCalendar(stat.teamName)}
                  className="block w-full text-left text-2xl font-black leading-tight text-slate-900 hover:text-blue-600 transition-colors whitespace-normal break-words"
                  type="button"
                >
                  {stat.teamName}
                </button>
                <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                  Next: {stat.nextWorkingDate || "Done"}
                </p>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setActiveTeamCalendar(stat.teamName)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition-all"
                  type="button"
                >
                  <Users className="w-4 h-4" />
                  <span>View Matrix</span>
                </button>
              </div>
            </SectionCard>
          );
        })}
      </section>

      {activeTeamCalendar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setActiveTeamCalendar(null)}
          />
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-y-auto no-scrollbar p-8 border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-900">
                {activeTeamCalendar} Matrix
              </h3>
              <button
                onClick={() => setActiveTeamCalendar(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-colors"
                type="button"
              >
                Close
              </button>
            </div>
            <TeamCalendar teamName={activeTeamCalendar} records={data.records} />
          </div>
        </div>
      )}
    </div>
  );
};
