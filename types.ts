export type Status = 'WORKING' | 'OFF';

export interface TeamStatus {
  [teamName: string]: Status;
}

export interface ScheduleRecord {
  dateISO: string;
  day: string;
  month: string;
  year: string;
  weekOfMonth: number;
  teams: TeamStatus;
}

export interface TeamStats {
  teamName: string;
  totalWorking: number;
  availabilityPercentage: number;
  nextWorkingDate: string | null;
  monthlyCounts: { [month: string]: number };
}

export interface ScheduleData {
  records: ScheduleRecord[];
  teams: string[];
  months: string[];
  stats: TeamStats[];
  globalAverageCoverage: number;
}

export interface NoteRecord {
  [dateISO: string]: string;
}

export type TeamFilterMode = "all" | "custom";

export type ViewType = 'dashboard' | 'table' | 'planner' | 'dependency' | 'poster' | 'guide' | 'airac';

export type AiracStatus = 'AIRAC' | 'NON-AIRAC';

export interface AiracCycleRecord {
  sourceTeam: string;
  revision: string;
  startDateISO: string;
  closeoutDateISO: string;
  status: AiracStatus;
  cycleLength: number | null;
}

export type SynergyMode = 'INTERSECTION' | 'THRESHOLD';
