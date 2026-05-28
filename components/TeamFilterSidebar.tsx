import React from "react";
import { TeamFilterMode } from "../types";
import { SidebarCard } from "./ui/DesignSystem";

interface TeamFilterSidebarProps {
  teams: string[];
  selectedTeams: string[];
  teamFilterMode: TeamFilterMode;
  onToggleTeam: (teamName: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export const TeamFilterSidebar: React.FC<TeamFilterSidebarProps> = ({
  teams,
  selectedTeams,
  teamFilterMode,
  onToggleTeam,
  onSelectAll,
  onDeselectAll,
}) => {
  const isTeamSelected = (teamName: string) =>
    teamFilterMode === "all" || selectedTeams.includes(teamName);
  const orderedTeams = React.useMemo(() => {
    const isHitech = (teamName: string) =>
      teamName.trim().toLowerCase().startsWith("hitech");
    const hitechTeams = teams.filter((team) => isHitech(team));
    const otherTeams = teams.filter((team) => !isHitech(team));
    return [...hitechTeams, ...otherTeams];
  }, [teams]);

  return (
    <SidebarCard className="flex flex-col">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">
            Department Filter
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-800">Teams</h2>
        </div>
        <div className="flex gap-2 text-xs font-semibold">
          <button
            onClick={onSelectAll}
            className="text-blue-600 hover:underline"
            type="button"
          >
            All
          </button>
          <span className="text-slate-300">|</span>
          <button
            onClick={onDeselectAll}
            className="text-slate-500 hover:underline"
            type="button"
          >
            None
          </button>
        </div>
      </div>

      <div className="space-y-2 overflow-y-auto custom-scrollbar max-h-[320px] pr-2">
        {orderedTeams.map((team) => (
          <label
            key={team}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
              checked={isTeamSelected(team)}
              onChange={() => onToggleTeam(team)}
            />
            <span className="flex-1 text-sm font-medium text-slate-700 truncate">
              {team}
            </span>
            <div
              className={`w-2 h-2 rounded-full ${
                isTeamSelected(team) ? "bg-blue-600" : "bg-slate-300"
              }`}
            />
          </label>
        ))}
      </div>
    </SidebarCard>
  );
};
