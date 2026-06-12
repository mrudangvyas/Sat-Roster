import React, { useState, useMemo, useEffect } from "react";
import { ScheduleData, SynergyMode } from "../types";
import { TIMEZONE } from "../constants";
import {
  Users,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface DependencyFinderProps {
  data: ScheduleData;
  highlightDates?: string[];
  enhancedMode?: boolean;
}

export const DependencyFinder: React.FC<DependencyFinderProps> = ({
  data,
  highlightDates = [],
  enhancedMode = false,
}) => {
  const [selectedTeams, setSelectedTeams] = useState<string[]>(() =>
    data.teams.slice(0, Math.min(2, data.teams.length)),
  );
  const [mode, setMode] = useState<SynergyMode>("INTERSECTION");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [selectedDate, setSelectedDate] = useState<string>("ALL");
  const [threshold, setThreshold] = useState(2);
  const now = new Date(
    new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE }).format(new Date()),
  );
  const nowISO = now.toISOString().split("T")[0];

  const saturdayDateOptions = useMemo(() => {
    const base =
      selectedMonth === "ALL"
        ? data.records
        : data.records.filter((record) => record.month === selectedMonth);
    return base.map((record) => record.dateISO);
  }, [data.records, selectedMonth]);

  useEffect(() => {
    if (selectedDate !== "ALL" && !saturdayDateOptions.includes(selectedDate)) {
      setSelectedDate("ALL");
    }
  }, [selectedDate, saturdayDateOptions]);

  useEffect(() => {
    setSelectedTeams((prev) => {
      const normalized = prev.filter((team) => data.teams.includes(team));
      if (normalized.length > 0) return normalized;
      return data.teams.slice(0, Math.min(2, data.teams.length));
    });
  }, [data.teams]);

  useEffect(() => {
    if (threshold > selectedTeams.length) {
      setThreshold(Math.max(1, selectedTeams.length));
    }
  }, [threshold, selectedTeams.length]);

  const overlappingDates = useMemo(() => {
    if (selectedTeams.length === 0) return [];
    return data.records.filter((r) => {
      const monthMatch = selectedMonth === "ALL" || r.month === selectedMonth;
      const dateMatch = selectedDate === "ALL" || r.dateISO === selectedDate;
      if (!monthMatch || !dateMatch) return false;
      const workingSelected = selectedTeams.filter(
        (t) => r.teams[t] === "WORKING",
      );
      if (mode === "INTERSECTION") {
        return workingSelected.length === selectedTeams.length;
      }
      return workingSelected.length >= threshold;
    });
  }, [data, selectedTeams, mode, threshold, selectedMonth, selectedDate]);

  const toggleTeam = (team: string) => {
    setSelectedTeams((prev) =>
      prev.includes(team)
        ? prev.length > 1
          ? prev.filter((t) => t !== team)
          : prev
        : prev.length < 6
        ? [...prev, team]
        : prev,
    );
  };

  const impactMatrix = useMemo(() => {
    return data.teams.map((team) => {
      const overlaps = overlappingDates.filter(
        (record) => record.teams[team] === "WORKING",
      ).length;
      const nextWorking = data.records.find(
        (record) => record.teams[team] === "WORKING" && record.dateISO >= nowISO,
      );
      return {
        team,
        overlaps,
        nextDate: nextWorking ? nextWorking.dateISO : "Done",
        isCritical: overlaps >= Math.max(3, threshold),
      };
    });
  }, [data, overlappingDates, threshold, nowISO]);

  const heatmap = useMemo(() => {
    return data.months.map((month) => {
      const monthRecords = data.records.filter((record) => record.month === month);
      return {
        month,
        totals: data.teams.map((team) => {
          const value = monthRecords.filter((record) => record.teams[team] === "WORKING").length;
          return { team, value };
        }),
      };
    });
  }, [data.months, data.records, data.teams]);

  const maxHeatValue = Math.max(
    ...heatmap.flatMap((row) => row.totals.map((total) => total.value)),
    1,
  );

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            Team Work Dates
          </p>
          <h2 className="mt-1 text-3xl font-bold flex items-center gap-2 text-slate-900">
            <Users size={28} className="text-blue-600" />
            Find Common Working Saturdays
          </h2>
          <p className="text-slate-500 font-medium">
            Select teams to see when they are working on the same Saturday.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="bg-white p-8 rounded-2xl space-y-8 relative border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.4em] font-black text-slate-400">
            <Filter size={14} />
            Choose Teams and Filters
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest">
              Select Teams (Min 2, Max 6)
            </label>
            <div className="flex flex-wrap gap-2">
              {data.teams.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTeam(t)}
                  type="button"
                  className={`px-4 py-2 rounded-2xl text-xs font-black border transition-all ${
                    selectedTeams.includes(t)
                      ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200"
                      : "bg-white border-slate-200 text-slate-500"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pt-4 border-t border-slate-200">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">
                Match Type
              </label>
              <div className="relative">
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as SynergyMode)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="INTERSECTION">All selected teams working</option>
                  <option value="THRESHOLD">Minimum number of selected teams working</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                  ▾
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">
                Month
              </label>
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    setSelectedDate("ALL");
                  }}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Months</option>
                  {data.months.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                  ▾
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">
                Specific Saturday
              </label>
              <div className="relative">
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Saturdays</option>
                  {saturdayDateOptions.map((dateISO) => (
                    <option key={dateISO} value={dateISO}>
                      {dateISO}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                  ▾
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6 pt-4 border-t border-slate-200">
            <div className="flex-1 w-full space-y-3">
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest">
                What this means
              </label>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs font-semibold text-slate-600">
                {mode === "INTERSECTION"
                  ? "All selected teams must be working on the same Saturday."
                  : `At least ${threshold} selected teams must be working on the same Saturday.`}
              </div>
            </div>

            {mode === "THRESHOLD" && (
              <div className="flex-1 w-full space-y-3">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  Minimum Teams: {threshold}
                </label>
                <input
                  type="range"
                  min="1"
                  max={selectedTeams.length}
                  value={threshold}
                  onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-600"
                />
              </div>
            )}

            <div className="shrink-0 bg-blue-50 px-6 py-4 rounded-2xl border border-blue-100">
              <p className="text-[10px] font-black uppercase text-blue-600 mb-1">
                Matching Saturdays
              </p>
              <p className="text-2xl font-black text-blue-700">
                {overlappingDates.length} Dates
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.4em] text-blue-600">
            <AlertTriangle size={18} />
            Team Summary
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Shows how many matching Saturdays each team has.
          </p>
          <div className="mt-4 space-y-2">
            {impactMatrix.map((entry) => (
              <div
                key={entry.team}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 border transition-all ${
                  entry.isCritical
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                <div>
                  <p className="text-sm font-black">{entry.team}</p>
                  <p className="text-[10px] text-slate-400">{entry.nextDate}</p>
                </div>
                <span
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    entry.isCritical
                      ? "bg-amber-500 text-white shadow"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {entry.overlaps} matches
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 text-[10px] font-black uppercase tracking-[0.4em] flex items-center justify-between text-slate-500">
            <span>Important matches</span>
            <span className="text-blue-400">
              {impactMatrix.filter((entry) => entry.isCritical).length} important
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {overlappingDates.map((record) => (
          <div
            key={record.dateISO}
            className={`bg-white p-6 rounded-2xl border hover:border-blue-200 hover:shadow-md shadow-sm transition-all flex justify-between items-center group ${
              enhancedMode && highlightDates.includes(record.dateISO)
                ? "border-amber-300 bg-amber-50/70"
                : "border-slate-200"
            }`}
          >
            <div>
              <div className="flex items-center space-x-2 text-blue-600 mb-1">
                <CheckCircle2 size={12} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {record.month}
                </span>
              </div>
              <p className="text-xl font-black">{record.dateISO}</p>
              <div className="flex -space-x-1 mt-3">
                {selectedTeams.map(
                  (team) =>
                    record.teams[team] === "WORKING" && (
                      <div
                        key={team}
                        className="w-6 h-6 rounded-full bg-slate-900 text-white text-[8px] font-black flex items-center justify-center border-2 border-white"
                        title={team}
                      >
                        {team.charAt(0)}
                      </div>
                    ),
                )}
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
              <ArrowRight size={20} />
            </div>
          </div>
        ))}
      </div>

      {overlappingDates.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border-dashed border-2 border-slate-200">
          <p className="text-slate-400 font-bold italic">
            Change the selected teams or filters to find matching Saturdays.
          </p>
        </div>
      )}

      {enhancedMode && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                Monthly Count
              </p>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                Dependency Impact Monthly Count
              </h3>
            </div>
            <p className="text-xs font-semibold text-slate-500">
              Click a number to filter that month and team.
            </p>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <div className="min-w-[760px]">
              <div
                className="grid gap-2 mb-2"
                style={{
                  gridTemplateColumns: `180px repeat(${data.teams.length}, minmax(90px, 1fr))`,
                }}
              >
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 py-1">
                  Month / Team
                </div>
                {data.teams.map((team) => (
                  <div
                    key={team}
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center px-2 py-1 truncate"
                  >
                    {team}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {heatmap.map((row) => (
                  <div
                    key={row.month}
                    className="grid gap-2"
                    style={{
                      gridTemplateColumns: `180px repeat(${data.teams.length}, minmax(90px, 1fr))`,
                    }}
                  >
                    <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800">
                      {row.month}
                    </div>
                    {row.totals.map((cell) => {
                      const intensity = cell.value / maxHeatValue;
                      return (
                        <button
                          key={`${row.month}-${cell.team}`}
                          onClick={() => {
                            setSelectedMonth(row.month);
                            setSelectedDate("ALL");
                            setSelectedTeams((previous) => {
                              if (previous.includes(cell.team)) {
                                return previous;
                              }
                              return [cell.team, ...previous].slice(0, 6);
                            });
                          }}
                          type="button"
                          className="relative rounded-xl border border-slate-200 px-2 py-2 text-xs font-bold text-slate-700 hover:shadow-sm transition-all"
                          style={{
                            backgroundColor: `rgba(37, 99, 235, ${0.1 + intensity * 0.35})`,
                          }}
                          title={`${row.month} - ${cell.team}: ${cell.value} working`}
                        >
                          {cell.value}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
