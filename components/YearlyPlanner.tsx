import React from "react";
import { StickyNote } from "lucide-react";
import { NoteRecord, ScheduleData } from "../types";

interface YearlyPlannerProps {
  data: ScheduleData;
  notes: NoteRecord;
  selectedYear: string;
}

export const YearlyPlanner: React.FC<YearlyPlannerProps> = ({
  data,
  notes,
  selectedYear,
}) => {
  const monthGroups = data.months.map((month) => ({
    name: month,
    records: data.records.filter((record) => record.month === month),
  }));

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
          Calendar Matrix
        </p>
        <h2 className="mt-1 text-2xl md:text-3xl font-bold text-slate-900">
          {selectedYear} Shift Matrix
        </h2>
        <p className="text-sm text-slate-500 font-medium">
          Month-wise planning board for all teams.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {monthGroups.map((group) => (
          <section
            key={group.name}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 relative"
          >
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-4">
              {group.name}
            </h3>

            <div className="grid grid-cols-1 gap-2">
              {group.records.map((record, index) => {
                const workingCount = Object.values(record.teams).filter(
                  (status) => status === "WORKING",
                ).length;
                const hasNote = Boolean(notes[record.dateISO]);

                const statusClass =
                  workingCount === 0
                    ? "bg-slate-50 text-slate-500 border-slate-100"
                    : "bg-blue-50 text-blue-700 border-blue-100";

                const isTopRow = index < 2;
                const tooltipPosClass = isTopRow ? "top-full mt-2" : "bottom-full mb-2";
                const arrowClass = isTopRow
                  ? "bottom-full border-b-white border-t-transparent"
                  : "top-full border-t-white border-b-transparent";

                return (
                  <div
                    key={record.dateISO}
                    className={`p-3 rounded-xl flex items-center justify-between border transition-all cursor-default group relative hover:shadow-sm ${statusClass}`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-700">
                          {record.dateISO.split("-")[2]} Sat
                        </span>
                        <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider">
                          W{record.weekOfMonth}
                        </span>
                      </div>
                      {hasNote && (
                        <StickyNote size={10} className="text-amber-500 shrink-0" />
                      )}
                    </div>

                    <div className="flex -space-x-1.5">
                      {data.teams.map(
                        (team, i) =>
                          record.teams[team] === "WORKING" && (
                            <div
                              key={`${team}-${i}`}
                              className="w-3 h-3 rounded-full bg-blue-500 border border-white shadow-sm"
                              title={team}
                            />
                          ),
                      )}
                    </div>

                    <div
                      className={`absolute left-1/2 -translate-x-1/2 z-[100] hidden group-hover:block w-64 max-w-[85vw] bg-white p-4 rounded-2xl shadow-2xl border border-slate-200 pointer-events-none animate-in fade-in zoom-in-95 duration-200 ${tooltipPosClass}`}
                    >
                      <div
                        className={`absolute left-1/2 -translate-x-1/2 border-8 border-x-transparent ${arrowClass}`}
                      />

                      <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                        <p className="text-[10px] font-black uppercase text-blue-600">
                          {record.dateISO}
                        </p>
                        <span className="text-[8px] px-1.5 py-0.5 bg-slate-100 rounded font-black uppercase text-slate-500">
                          Week {record.weekOfMonth}
                        </span>
                      </div>

                      {notes[record.dateISO] && (
                        <div className="mb-3 p-2 bg-amber-50 rounded-lg text-[10px] font-bold text-amber-700 leading-relaxed border border-amber-100">
                          <div className="flex items-center space-x-1 mb-1 opacity-70">
                            <StickyNote size={10} />
                            <span className="uppercase text-[8px] tracking-tighter">
                              Annotation
                            </span>
                          </div>
                          "{notes[record.dateISO]}"
                        </div>
                      )}

                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                        {data.teams.map((team) => {
                          const isWorking = record.teams[team] === "WORKING";
                          return (
                            <div
                              key={team}
                              className="flex items-center justify-between text-[10px] py-1 border-b border-slate-50 last:border-0"
                            >
                              <span
                                className={`font-bold truncate pr-2 ${
                                  isWorking ? "text-slate-900" : "opacity-40 text-slate-500"
                                }`}
                              >
                                {team}
                              </span>
                              <span
                                className={`font-black uppercase tracking-wider shrink-0 ${
                                  isWorking ? "text-blue-600" : "text-slate-300"
                                }`}
                              >
                                {record.teams[team]}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="p-6 bg-white border border-slate-200 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h4 className="font-bold text-slate-800">Density Index</h4>
          <p className="text-xs text-slate-500">
            Blue indicators mark rostered teams. Hover a Saturday row for full
            team status and annotations.
          </p>
        </div>
        <div className="flex items-center space-x-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Team On-Duty</span>
          </div>
          <div className="flex items-center space-x-2">
            <StickyNote size={12} className="text-amber-500" />
            <span>Internal Note</span>
          </div>
        </div>
      </div>
    </div>
  );
};
