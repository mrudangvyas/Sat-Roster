import React from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { SidebarCard } from "./ui/DesignSystem";

interface ScheduleFilterPanelProps {
  availableMonths: string[];
  selectedMonths: string[];
  selectedSaturday: string;
  saturdayDropdownOptions: string[];
  statusFilter: "ALL" | "WORKING" | "OFF";
  onlyNotesFilter: boolean;
  noteWorkflowFilter?: "ALL" | "none" | "note" | "action-required" | "resolved";
  showNoteWorkflowFilter?: boolean;
  activeFilterCount: number;
  onMonthChange: (value: string) => void;
  onSaturdayChange: (value: string) => void;
  onStatusChange: (value: "ALL" | "WORKING" | "OFF") => void;
  onOnlyNotesChange: (checked: boolean) => void;
  onNoteWorkflowChange?: (value: "ALL" | "none" | "note" | "action-required" | "resolved") => void;
  onResetFilters: () => void;
}

export const ScheduleFilterPanel: React.FC<ScheduleFilterPanelProps> = ({
  availableMonths,
  selectedMonths,
  selectedSaturday,
  saturdayDropdownOptions,
  statusFilter,
  onlyNotesFilter,
  noteWorkflowFilter = "ALL",
  showNoteWorkflowFilter = false,
  activeFilterCount,
  onMonthChange,
  onSaturdayChange,
  onStatusChange,
  onOnlyNotesChange,
  onNoteWorkflowChange,
  onResetFilters,
}) => {
  return (
    <SidebarCard>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">
            Selection Engine
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-800">
            Schedule Filters
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Shared across dashboard, planner, AIRAC, dependency, and registry.
          </p>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
          {activeFilterCount} Active
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
            Month
          </label>
          <div className="relative">
            <select
              value={selectedMonths[0] || "ALL"}
              onChange={(event) => onMonthChange(event.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold py-2.5 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors hover:bg-slate-100"
            >
              <option value="ALL">All Months</option>
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
            Specific Saturday
          </label>
          <div className="relative">
            <select
              value={selectedSaturday}
              onChange={(event) => onSaturdayChange(event.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold py-2.5 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors hover:bg-slate-100"
            >
              <option value="ALL">All Saturdays</option>
              {saturdayDropdownOptions.map((dateISO) => (
                <option key={dateISO} value={dateISO}>
                  {dateISO}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
            Status
          </label>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(event) =>
                onStatusChange(event.target.value as "ALL" | "WORKING" | "OFF")
              }
              className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold py-2.5 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors hover:bg-slate-100"
            >
              <option value="ALL">All Status</option>
              <option value="WORKING">Working</option>
              <option value="OFF">Off</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyNotesFilter}
            onChange={(event) => onOnlyNotesChange(event.target.checked)}
            className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-slate-700">
            Only with annotations
          </span>
        </label>

        {showNoteWorkflowFilter && onNoteWorkflowChange && (
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              Annotation State
            </label>
            <div className="relative">
              <select
                value={noteWorkflowFilter}
                onChange={(event) =>
                  onNoteWorkflowChange(
                    event.target.value as
                      | "ALL"
                      | "none"
                      | "note"
                      | "action-required"
                      | "resolved",
                  )}
                className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold py-2.5 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors hover:bg-slate-100"
              >
                <option value="ALL">All Annotation States</option>
                <option value="none">No Annotation</option>
                <option value="note">Note</option>
                <option value="action-required">Action Required</option>
                <option value="resolved">Resolved</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}

        <button
          onClick={onResetFilters}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95"
          type="button"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset Filters</span>
        </button>
      </div>
    </SidebarCard>
  );
};
