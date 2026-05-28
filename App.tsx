import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  Download,
  Printer,
} from "lucide-react";
import { RAW_CSV_DATA, APP_CONFIG, TIMEZONE } from "./constants";
import { processScheduleData } from "./dataProcessor";
import {
  AiracCycleRecord,
  NoteRecord,
  ScheduleData,
  ScheduleRecord,
  TeamFilterMode,
  ViewType,
} from "./types";
import { Dashboard } from "./components/Dashboard";
import { ScheduleTable } from "./components/ScheduleTable";
import { YearlyPlanner } from "./components/YearlyPlanner";
import { DependencyFinder } from "./components/DependencyFinder";
import { YearPoster } from "./components/YearPoster";
import { DayDetailDrawer } from "./components/DayDetailDrawer";
import { FeatureGuide } from "./components/FeatureGuide";
import { AiracInsights } from "./components/AiracInsights";
import { AssistantChat } from "./components/AssistantChat";
import { TeamFilterSidebar } from "./components/TeamFilterSidebar";
import { ScheduleFilterPanel } from "./components/ScheduleFilterPanel";
import { PageShell, SegmentedTabs } from "./components/ui/DesignSystem";

const deriveScheduleData = (
  records: ScheduleRecord[],
  teams: string[],
  nowISO: string,
): ScheduleData => {
  const months = Array.from(new Set(records.map((record) => record.month)));
  let totalWorkingShifts = 0;

  const stats = teams.map((team) => {
    const workingDays = records.filter(
      (record) => record.teams[team] === "WORKING",
    );
    const monthlyCounts: { [month: string]: number } = {};

    months.forEach((month) => {
      monthlyCounts[month] = workingDays.filter(
        (record) => record.month === month,
      ).length;
    });

    const availabilityPercentage = records.length
      ? (workingDays.length / records.length) * 100
      : 0;

    totalWorkingShifts += workingDays.length;
    const nextWorking = workingDays.find((record) => record.dateISO >= nowISO);

    return {
      teamName: team,
      totalWorking: workingDays.length,
      availabilityPercentage,
      nextWorkingDate: nextWorking ? nextWorking.dateISO : null,
      monthlyCounts,
    };
  });

  const globalAverageCoverage =
    records.length && teams.length
      ? (totalWorkingShifts / (records.length * teams.length)) * 100
      : 0;

  return {
    records,
    teams,
    months,
    stats,
    globalAverageCoverage,
  };
};

interface AppProps {
  variant?: "classic" | "v2";
}

type NoteWorkflowState = "none" | "note" | "action-required" | "resolved";
type NoteWorkflowFilter = "ALL" | NoteWorkflowState;

interface CompareSnapshot {
  compareYear: string;
  coverage: number;
  heavyDates: number;
  avgTeamWorking: number;
  totalSaturdays: number;
  airacCount: number;
}

interface StaticScheduleDataset {
  defaultYear: string;
  availableYears: string[];
  csvByYear: Record<string, string>;
  generatedAt: string;
}

interface StaticAiracDataset {
  defaultYear: string;
  availableYears: string[];
  recordsByYear: Record<string, AiracCycleRecord[]>;
  generatedAt: string;
}

const NOTE_WORKFLOW_KEY = "satroster_note_workflow";
const ALERT_STALE_MINUTES = 45;
const AIRAC_CONFLICT_WINDOW_DAYS = 3;
const STATIC_SCHEDULE_DATA_URL = `${import.meta.env.BASE_URL}api/schedule-by-year.json`;
const STATIC_AIRAC_DATA_URL = `${import.meta.env.BASE_URL}api/airac-by-year.json`;

let scheduleDatasetPromise: Promise<StaticScheduleDataset> | null = null;
let airacDatasetPromise: Promise<StaticAiracDataset> | null = null;

const fetchStaticJson = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Static dataset request failed: ${response.status}`);
  }
  return (await response.json()) as T;
};

const loadScheduleDataset = () => {
  scheduleDatasetPromise =
    scheduleDatasetPromise ??
    fetchStaticJson<StaticScheduleDataset>(STATIC_SCHEDULE_DATA_URL);
  return scheduleDatasetPromise;
};

const loadAiracDataset = () => {
  airacDatasetPromise =
    airacDatasetPromise ??
    fetchStaticJson<StaticAiracDataset>(STATIC_AIRAC_DATA_URL);
  return airacDatasetPromise;
};

const resolveYear = (
  requestedYear: string,
  availableYears: string[],
  defaultYear: string,
) => {
  if (availableYears.includes(requestedYear)) {
    return requestedYear;
  }
  if (availableYears.includes(defaultYear)) {
    return defaultYear;
  }
  return availableYears[0] || requestedYear;
};

const parseStoredNoteWorkflow = () => {
  const raw = localStorage.getItem(NOTE_WORKFLOW_KEY);
  if (!raw) {
    return {} as Record<string, Exclude<NoteWorkflowState, "none">>;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    const normalized: Record<string, Exclude<NoteWorkflowState, "none">> = {};
    Object.entries(parsed).forEach(([dateISO, status]) => {
      if (
        status === "note" ||
        status === "action-required" ||
        status === "resolved"
      ) {
        normalized[dateISO] = status;
      }
    });
    return normalized;
  } catch {
    return {} as Record<string, Exclude<NoteWorkflowState, "none">>;
  }
};

const diffDays = (leftISO: string, rightISO: string) => {
  const left = new Date(`${leftISO}T00:00:00Z`).getTime();
  const right = new Date(`${rightISO}T00:00:00Z`).getTime();
  return Math.round((left - right) / (24 * 60 * 60 * 1000));
};

const App: React.FC<AppProps> = ({ variant = "classic" }) => {
  type ScheduleSourceMode = "static" | "fallback" | "uploaded";
  const isV2 = variant === "v2";

  const [data, setData] = useState<ScheduleData | null>(null);
  const [view, setView] = useState<ViewType>("dashboard");
  const [selectedYear, setSelectedYear] = useState(APP_CONFIG.CURRENT_YEAR);
  const [notes, setNotes] = useState<NoteRecord>(() => {
    const saved = localStorage.getItem("satroster_notes");
    return saved ? JSON.parse(saved) : {};
  });
  const [selectedDetailRecord, setSelectedDetailRecord] =
    useState<ScheduleRecord | null>(null);
  const [airacRecords, setAiracRecords] = useState<AiracCycleRecord[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedSaturday, setSelectedSaturday] = useState<string>("ALL");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [teamFilterMode, setTeamFilterMode] = useState<TeamFilterMode>("all");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "WORKING" | "OFF">(
    "ALL",
  );
  const [noteWorkflowFilter, setNoteWorkflowFilter] =
    useState<NoteWorkflowFilter>("ALL");
  const [onlyNotesFilter, setOnlyNotesFilter] = useState(false);
  const [noteWorkflowByDate, setNoteWorkflowByDate] = useState<
    Record<string, Exclude<NoteWorkflowState, "none">>
  >(() => parseStoredNoteWorkflow());
  const [uploadedCsv, setUploadedCsv] = useState<string | null>(null);
  const [isImported, setIsImported] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [scheduleSourceMode, setScheduleSourceMode] =
    useState<ScheduleSourceMode>("static");
  const [scheduleWarning, setScheduleWarning] = useState<string | null>(null);
  const [airacResolvedYear, setAiracResolvedYear] = useState<string>(
    APP_CONFIG.CURRENT_YEAR,
  );
  const [airacAvailableYears, setAiracAvailableYears] = useState<string[]>([]);
  const [airacWarning, setAiracWarning] = useState<string | null>(null);
  const [scheduleFetchedAt, setScheduleFetchedAt] = useState<string | null>(
    null,
  );
  const [airacFetchedAt, setAiracFetchedAt] = useState<string | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isAlertCenterOpen, setIsAlertCenterOpen] = useState(false);
  const [isAuditPanelOpen, setIsAuditPanelOpen] = useState(false);
  const [isCompareModeEnabled, setIsCompareModeEnabled] = useState(false);
  const [compareSnapshot, setCompareSnapshot] =
    useState<CompareSnapshot | null>(null);
  const [compareWarning, setCompareWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const quickJumpRef = useRef<HTMLSelectElement | null>(null);
  const keyChordRef = useRef<{ key: string; at: number }>({ key: "", at: 0 });
  const scheduleCacheRef = useRef<Record<string, string>>({});

  const nowISO = useMemo(() => {
    const now = new Date(
      new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE }).format(
        new Date(),
      ),
    );
    return now.toISOString().split("T")[0];
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (uploadedCsv) {
        try {
          setData(processScheduleData(uploadedCsv));
          setScheduleSourceMode("uploaded");
          setScheduleFetchedAt(new Date().toISOString());
          setScheduleWarning(
            "Using uploaded CSV data. Year switching is locked until you restore default schedule.",
          );
        } catch (error) {
          console.warn("Uploaded CSV parse failed:", error);
          setUploadError("Uploaded CSV could not be parsed.");
          setScheduleWarning(
            "Uploaded CSV parse failed. Restore default schedule.",
          );
        }
        return;
      }

      try {
        const dataset = await loadScheduleDataset();
        const availableYears = Array.isArray(dataset.availableYears)
          ? dataset.availableYears
          : [];
        const resolvedYear = resolveYear(
          selectedYear,
          availableYears,
          dataset.defaultYear || APP_CONFIG.CURRENT_YEAR,
        );
        const csv = dataset.csvByYear?.[resolvedYear];
        if (!csv) {
          throw new Error("No schedule CSV found in static dataset");
        }
        scheduleCacheRef.current[resolvedYear] = csv;

        setData(processScheduleData(csv));
        setIsImported(false);
        setScheduleSourceMode("static");
        setScheduleFetchedAt(new Date().toISOString());
        setScheduleWarning(
          resolvedYear !== selectedYear
            ? `Schedule year ${selectedYear} is unavailable. Showing ${resolvedYear}.`
            : null,
        );
        setUploadError(null);
      } catch (error) {
        console.warn("Using fallback data:", error);
        const cachedCsv = scheduleCacheRef.current[selectedYear];
        const fallbackCsv = cachedCsv || RAW_CSV_DATA;
        setData(processScheduleData(fallbackCsv));
        setIsImported(false);
        setScheduleSourceMode("fallback");
        setScheduleFetchedAt(new Date().toISOString());
        setScheduleWarning(
          cachedCsv
            ? `Static schedule dataset is unavailable. Displaying cached ${selectedYear} schedule data.`
            : selectedYear === APP_CONFIG.CURRENT_YEAR
              ? "Static schedule dataset is unavailable. Displaying bundled fallback data."
              : `Static schedule dataset is unavailable. Displaying bundled ${APP_CONFIG.CURRENT_YEAR} fallback data for requested year ${selectedYear}.`,
        );
      }
    };

    fetchData();
  }, [selectedYear, uploadedCsv]);

  useEffect(() => {
    const fetchAiracData = async () => {
      try {
        const dataset = await loadAiracDataset();
        const availableYears = Array.isArray(dataset.availableYears)
          ? dataset.availableYears
          : [];
        const resolvedYear = resolveYear(
          selectedYear,
          availableYears,
          dataset.defaultYear || APP_CONFIG.CURRENT_YEAR,
        );
        const records = Array.isArray(dataset.recordsByYear?.[resolvedYear])
          ? dataset.recordsByYear[resolvedYear]
          : [];
        setAiracRecords(records);
        setAiracResolvedYear(resolvedYear);
        setAiracAvailableYears(availableYears);
        setAiracWarning(
          resolvedYear !== selectedYear
            ? `AIRAC year ${selectedYear} is unavailable. Showing ${resolvedYear}.`
            : null,
        );
        setAiracFetchedAt(new Date().toISOString());
      } catch (error) {
        console.warn("AIRAC static data unavailable:", error);
        setAiracRecords([]);
        setAiracResolvedYear(selectedYear);
        setAiracAvailableYears([]);
        setAiracWarning(
          `AIRAC static dataset unavailable for requested year ${selectedYear}.`,
        );
        setAiracFetchedAt(new Date().toISOString());
      }
    };

    fetchAiracData();
  }, [selectedYear]);

  useEffect(() => {
    localStorage.setItem("satroster_notes", JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem(NOTE_WORKFLOW_KEY, JSON.stringify(noteWorkflowByDate));
  }, [noteWorkflowByDate]);

  useEffect(() => {
    if (!data) {
      return;
    }

    setNoteWorkflowByDate((previous) => {
      const next: Record<string, Exclude<NoteWorkflowState, "none">> = {};
      data.records.forEach((record) => {
        const status = previous[record.dateISO];
        if (status) {
          next[record.dateISO] = status;
        }
      });
      const prevKeys = Object.keys(previous);
      const nextKeys = Object.keys(next);
      const sameShape =
        prevKeys.length === nextKeys.length &&
        prevKeys.every((key) => previous[key] === next[key]);
      return sameShape ? previous : next;
    });
  }, [data]);

  useEffect(() => {
    if (!isV2 || !isCompareModeEnabled || isImported) {
      setCompareSnapshot(null);
      setCompareWarning(null);
      return;
    }

    const parsedYear = Number(selectedYear);
    if (!Number.isFinite(parsedYear) || parsedYear <= 1) {
      setCompareSnapshot(null);
      setCompareWarning("Year compare is unavailable for this schedule year.");
      return;
    }

    const compareYear = String(parsedYear - 1);
    const fetchCompare = async () => {
      try {
        const scheduleDataset = await loadScheduleDataset();
        const scheduleYears = Array.isArray(scheduleDataset.availableYears)
          ? scheduleDataset.availableYears
          : [];
        const resolvedCompareYear = resolveYear(
          compareYear,
          scheduleYears,
          scheduleDataset.defaultYear || APP_CONFIG.CURRENT_YEAR,
        );
        const compareCsv = scheduleDataset.csvByYear?.[resolvedCompareYear];
        if (!compareCsv) {
          throw new Error("Compare year schedule is unavailable");
        }
        const compareData = processScheduleData(compareCsv);
        let compareAiracCount = 0;
        try {
          const airacDataset = await loadAiracDataset();
          const airacYears = Array.isArray(airacDataset.availableYears)
            ? airacDataset.availableYears
            : [];
          const resolvedAiracYear = resolveYear(
            compareYear,
            airacYears,
            airacDataset.defaultYear || APP_CONFIG.CURRENT_YEAR,
          );
          const airacRecordsForYear = airacDataset.recordsByYear?.[
            resolvedAiracYear
          ];
          compareAiracCount = Array.isArray(airacRecordsForYear)
            ? airacRecordsForYear.length
            : 0;
        } catch (airacError) {
          console.warn("Compare AIRAC static dataset unavailable:", airacError);
        }
        const heavyDates = compareData.records.filter((record) => {
          const working = compareData.teams.filter(
            (team) => record.teams[team] === "WORKING",
          ).length;
          return working >= APP_CONFIG.LOAD_THRESHOLDS.HEAVY;
        }).length;
        const avgTeamWorking = compareData.stats.length
          ? compareData.stats.reduce(
              (sum, stat) => sum + stat.totalWorking,
              0,
            ) / compareData.stats.length
          : 0;

        setCompareSnapshot({
          compareYear,
          coverage: compareData.globalAverageCoverage,
          heavyDates,
          avgTeamWorking,
          totalSaturdays: compareData.records.length,
          airacCount: compareAiracCount,
        });
        setCompareWarning(null);
      } catch (error) {
        console.warn("Compare mode unavailable:", error);
        setCompareSnapshot(null);
        setCompareWarning(`Unable to load compare year ${compareYear}.`);
      }
    };

    fetchCompare();
  }, [isCompareModeEnabled, isImported, isV2, selectedYear]);

  useEffect(() => {
    if (!data || teamFilterMode === "all") {
      return;
    }

    setSelectedTeams((previous) => {
      const next = previous.filter((team) => data.teams.includes(team));
      return next.length === previous.length ? previous : next;
    });
  }, [data, teamFilterMode]);

  const handleToggleTeam = (teamName: string) => {
    if (!data) {
      return;
    }

    if (teamFilterMode === "all") {
      setTeamFilterMode("custom");
      setSelectedTeams(data.teams.filter((team) => team !== teamName));
      return;
    }

    setSelectedTeams((previous) =>
      previous.includes(teamName)
        ? previous.filter((team) => team !== teamName)
        : [...previous, teamName],
    );
  };

  const handleSelectAllTeams = () => {
    setTeamFilterMode("all");
    setSelectedTeams([]);
  };

  const handleDeselectAllTeams = () => {
    setTeamFilterMode("custom");
    setSelectedTeams([]);
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setUploadError("Only CSV uploads are supported in this workflow.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (readEvent) => {
      try {
        const csv = String(readEvent.target?.result ?? "");
        const parsed = processScheduleData(csv);

        if (!parsed.records.length) {
          throw new Error("No records found in uploaded CSV.");
        }

        setData(parsed);
        setUploadedCsv(csv);
        setIsImported(true);
        setUploadError(null);
        setTeamFilterMode("all");
        setSelectedTeams([]);

        const csvYear = parsed.records[0]?.year;
        if (csvYear) {
          setSelectedYear(csvYear);
        }
      } catch (error) {
        console.warn("CSV import failed:", error);
        setUploadError("CSV import failed. Confirm the SatRoster CSV format.");
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    reader.readAsText(file);
  };

  const restoreDefaultSchedule = () => {
    setUploadedCsv(null);
    setIsImported(false);
    setUploadError(null);
    setTeamFilterMode("all");
    setSelectedTeams([]);
  };

  const filteredRecords = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.records.filter((record) => {
      const monthMatch =
        selectedMonths.length === 0 || selectedMonths.includes(record.month);
      const selectedSaturdayMatch =
        selectedSaturday === "ALL" || record.dateISO === selectedSaturday;
      const noteMatch = !onlyNotesFilter || !!notes[record.dateISO];
      const noteWorkflowState =
        noteWorkflowByDate[record.dateISO] ||
        (notes[record.dateISO]?.trim() ? "note" : "none");
      const noteWorkflowMatch =
        noteWorkflowFilter === "ALL" ||
        noteWorkflowState === noteWorkflowFilter;

      let teamMatch = true;
      if (teamFilterMode === "all") {
        teamMatch =
          statusFilter === "ALL" ||
          Object.values(record.teams).some((status) => status === statusFilter);
      } else {
        if (selectedTeams.length === 0) {
          return false;
        }

        teamMatch =
          statusFilter === "ALL" ||
          selectedTeams.some((team) => record.teams[team] === statusFilter);
      }

      return (
        monthMatch &&
        selectedSaturdayMatch &&
        noteMatch &&
        noteWorkflowMatch &&
        teamMatch
      );
    });
  }, [
    data,
    noteWorkflowByDate,
    noteWorkflowFilter,
    notes,
    onlyNotesFilter,
    selectedMonths,
    selectedSaturday,
    selectedTeams,
    statusFilter,
    teamFilterMode,
  ]);

  const filteredScheduleData = useMemo(() => {
    if (!data) {
      return null;
    }

    const scopedTeams = teamFilterMode === "all" ? data.teams : selectedTeams;
    return deriveScheduleData(filteredRecords, scopedTeams, nowISO);
  }, [data, filteredRecords, nowISO, selectedTeams, teamFilterMode]);

  const resetFilters = () => {
    setSelectedMonths([]);
    setSelectedSaturday("ALL");
    setTeamFilterMode("all");
    setSelectedTeams([]);
    setStatusFilter("ALL");
    setNoteWorkflowFilter("ALL");
    setOnlyNotesFilter(false);
  };

  const handleSaveNote = (dateISO: string, content: string) => {
    setNotes((previous) => ({ ...previous, [dateISO]: content }));
    const trimmed = content.trim();
    setNoteWorkflowByDate((previous) => {
      if (!trimmed) {
        if (!previous[dateISO]) {
          return previous;
        }
        const next = { ...previous };
        delete next[dateISO];
        return next;
      }
      if (previous[dateISO]) {
        return previous;
      }
      return { ...previous, [dateISO]: "note" };
    });
  };

  const handleSaveNoteWorkflow = (
    dateISO: string,
    status: Exclude<NoteWorkflowState, "none"> | "none",
  ) => {
    setNoteWorkflowByDate((previous) => {
      if (status === "none") {
        if (!previous[dateISO]) {
          return previous;
        }
        const next = { ...previous };
        delete next[dateISO];
        return next;
      }
      return { ...previous, [dateISO]: status };
    });
  };

  const saturdayDropdownOptions = useMemo(() => {
    if (!data) {
      return [];
    }

    const base = selectedMonths.length
      ? data.records.filter((record) => selectedMonths.includes(record.month))
      : data.records;

    return base.map((record) => record.dateISO);
  }, [data, selectedMonths]);

  const handleMonthFilterChange = (monthValue: string) => {
    setSelectedMonths(monthValue === "ALL" ? [] : [monthValue]);
    setSelectedSaturday("ALL");
  };

  const yearOptions = useMemo(() => {
    const values = new Set(APP_CONFIG.AVAILABLE_YEARS);
    values.add(selectedYear);

    const dataYear = data?.records[0]?.year;
    if (dataYear) {
      values.add(dataYear);
    }

    return Array.from(values).sort();
  }, [data, selectedYear]);

  const isYearLocked = isImported;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedMonths.length > 0) {
      count += 1;
    }
    if (selectedSaturday !== "ALL") {
      count += 1;
    }
    if (statusFilter !== "ALL") {
      count += 1;
    }
    if (noteWorkflowFilter !== "ALL") {
      count += 1;
    }
    if (onlyNotesFilter) {
      count += 1;
    }
    if (teamFilterMode === "custom") {
      count += 1;
    }
    return count;
  }, [
    noteWorkflowFilter,
    onlyNotesFilter,
    selectedMonths,
    selectedSaturday,
    statusFilter,
    teamFilterMode,
  ]);

  useEffect(() => {
    if (selectedSaturday === "ALL") {
      return;
    }

    if (!saturdayDropdownOptions.includes(selectedSaturday)) {
      setSelectedSaturday("ALL");
    }
  }, [saturdayDropdownOptions, selectedSaturday]);

  const scopedTeamsForInsights = useMemo(() => {
    if (!data) {
      return [];
    }
    return teamFilterMode === "all" ? data.teams : selectedTeams;
  }, [data, selectedTeams, teamFilterMode]);

  const activeRecordsForInsights = useMemo(
    () => filteredScheduleData?.records ?? data?.records ?? [],
    [data, filteredScheduleData],
  );

  const quickNextSaturdayRecord = useMemo(
    () =>
      activeRecordsForInsights.find((record) => record.dateISO >= nowISO) ||
      null,
    [activeRecordsForInsights, nowISO],
  );

  const noteWorkflowCounts = useMemo(() => {
    const counts: Record<NoteWorkflowState, number> = {
      none: 0,
      note: 0,
      "action-required": 0,
      resolved: 0,
    };

    filteredRecords.forEach((record) => {
      const status =
        noteWorkflowByDate[record.dateISO] ||
        (notes[record.dateISO]?.trim() ? "note" : "none");
      counts[status] += 1;
    });

    return counts;
  }, [filteredRecords, noteWorkflowByDate, notes]);

  const loadBalanceInsight = useMemo(() => {
    const stats = filteredScheduleData?.stats ?? data?.stats ?? [];
    if (!stats.length) {
      return {
        score: 0,
        stdDev: 0,
        min: null as { team: string; value: number } | null,
        max: null as { team: string; value: number } | null,
      };
    }

    const values = stats.map((stat) => stat.totalWorking);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance =
      values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
      values.length;
    const stdDev = Math.sqrt(variance);
    const score = Math.max(0, 100 - (mean ? (stdDev / mean) * 120 : 100));

    const minStat = stats.reduce((best, stat) =>
      stat.totalWorking < best.totalWorking ? stat : best,
    );
    const maxStat = stats.reduce((best, stat) =>
      stat.totalWorking > best.totalWorking ? stat : best,
    );

    return {
      score,
      stdDev,
      min: { team: minStat.teamName, value: minStat.totalWorking },
      max: { team: maxStat.teamName, value: maxStat.totalWorking },
    };
  }, [data, filteredScheduleData]);

  const airacConflictRecords = useMemo(() => {
    if (!activeRecordsForInsights.length || !airacRecords.length) {
      return [] as Array<{
        dateISO: string;
        starts: number;
        closeouts: number;
        workingTeams: number;
      }>;
    }

    return activeRecordsForInsights
      .map((record) => {
        let starts = 0;
        let closeouts = 0;

        airacRecords.forEach((airac) => {
          if (
            Math.abs(diffDays(record.dateISO, airac.startDateISO)) <=
            AIRAC_CONFLICT_WINDOW_DAYS
          ) {
            starts += 1;
          }
          if (
            Math.abs(diffDays(record.dateISO, airac.closeoutDateISO)) <=
            AIRAC_CONFLICT_WINDOW_DAYS
          ) {
            closeouts += 1;
          }
        });

        const workingTeams = scopedTeamsForInsights.filter(
          (team) => record.teams[team] === "WORKING",
        ).length;

        return {
          dateISO: record.dateISO,
          starts,
          closeouts,
          workingTeams,
        };
      })
      .filter((entry) => entry.starts > 0 || entry.closeouts > 0)
      .sort((left, right) => left.dateISO.localeCompare(right.dateISO));
  }, [activeRecordsForInsights, airacRecords, scopedTeamsForInsights]);

  const upcomingAiracConflictRecords = useMemo(
    () => airacConflictRecords.filter((entry) => entry.dateISO >= nowISO),
    [airacConflictRecords, nowISO],
  );

  const scheduleAgeMinutes = useMemo(() => {
    if (!scheduleFetchedAt) {
      return null;
    }
    return Math.max(
      0,
      Math.floor((Date.now() - new Date(scheduleFetchedAt).getTime()) / 60000),
    );
  }, [scheduleFetchedAt]);

  const airacAgeMinutes = useMemo(() => {
    if (!airacFetchedAt) {
      return null;
    }
    return Math.max(
      0,
      Math.floor((Date.now() - new Date(airacFetchedAt).getTime()) / 60000),
    );
  }, [airacFetchedAt]);

  useEffect(() => {
    if (!isV2) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget = Boolean(
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable),
      );
      if (isTypingTarget) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "/") {
        event.preventDefault();
        quickJumpRef.current?.focus();
        return;
      }

      const nowAt = Date.now();
      if (
        keyChordRef.current.key === "g" &&
        nowAt - keyChordRef.current.at <= 1200
      ) {
        if (key === "d") {
          event.preventDefault();
          setView("dashboard");
        } else if (key === "a") {
          event.preventDefault();
          setView("airac");
        } else if (key === "n" && quickNextSaturdayRecord) {
          event.preventDefault();
          setView("dashboard");
          setSelectedDetailRecord(quickNextSaturdayRecord);
        }
        keyChordRef.current = { key: "", at: 0 };
        return;
      }

      if (key === "g") {
        keyChordRef.current = { key: "g", at: nowAt };
      } else {
        keyChordRef.current = { key: "", at: 0 };
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isV2, quickNextSaturdayRecord]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-blue-600 font-bold">
            Initializing SatRoster {selectedYear}...
          </p>
        </div>
      </div>
    );
  }

  const activeScheduleData = filteredScheduleData ?? data;
  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    // { id: "planner", label: "Planner" },
    { id: "airac", label: "AIRAC" },
    { id: "dependency", label: "Dependency" },
    // { id: "table", label: "Registry" },
    { id: "guide", label: "Guide" },
  ] as const;

  const scopedTeams = teamFilterMode === "all" ? data.teams : selectedTeams;

  const nextSaturdayRecord =
    activeScheduleData.records.find((record) => record.dateISO >= nowISO) ||
    null;

  const topRiskRecord = (() => {
    if (!activeScheduleData.records.length) {
      return null;
    }
    let maxCount = -1;
    let candidate: ScheduleRecord | null = null;
    activeScheduleData.records.forEach((record) => {
      const working = scopedTeams.filter(
        (team) => record.teams[team] === "WORKING",
      ).length;
      if (working > maxCount) {
        maxCount = working;
        candidate = record;
      }
    });
    return candidate;
  })();

  const nextSaturdayWorkingCount = nextSaturdayRecord
    ? scopedTeams.filter((team) => nextSaturdayRecord.teams[team] === "WORKING")
        .length
    : 0;

  const activeAiracTodayCount = airacRecords.filter(
    (record) =>
      record.startDateISO <= nowISO && record.closeoutDateISO >= nowISO,
  ).length;

  const openNotesCount = filteredRecords.filter((record) =>
    Boolean(notes[record.dateISO]),
  ).length;
  const actionRequiredNotesCount = noteWorkflowCounts["action-required"];
  const resolvedNotesCount = noteWorkflowCounts.resolved;

  const criticalDependencyCount = filteredRecords.filter((record) => {
    const working = scopedTeams.filter(
      (team) => record.teams[team] === "WORKING",
    ).length;
    return working >= APP_CONFIG.LOAD_THRESHOLDS.HEAVY;
  }).length;

  const nextFourSaturdayRecords = activeScheduleData.records
    .filter((record) => record.dateISO >= nowISO)
    .slice(0, 4)
    .map((record) => {
      const working = scopedTeams.filter(
        (team) => record.teams[team] === "WORKING",
      ).length;
      const risk =
        working >= APP_CONFIG.LOAD_THRESHOLDS.HEAVY
          ? "high"
          : working >= APP_CONFIG.LOAD_THRESHOLDS.MEDIUM
            ? "medium"
            : "light";
      return { record, working, risk };
    });

  const yearIntegrityMismatch = selectedYear !== airacResolvedYear;
  const compareCoverageDelta = compareSnapshot
    ? activeScheduleData.globalAverageCoverage - compareSnapshot.coverage
    : null;
  const compareHeavyDelta = compareSnapshot
    ? criticalDependencyCount - compareSnapshot.heavyDates
    : null;
  const compareAiracDelta = compareSnapshot
    ? airacRecords.length - compareSnapshot.airacCount
    : null;
  const isScheduleStale = (scheduleAgeMinutes ?? 0) > ALERT_STALE_MINUTES;
  const isAiracStale = (airacAgeMinutes ?? 0) > ALERT_STALE_MINUTES;

  const formatFetchedAt = (value: string | null) => {
    if (!value) {
      return "--:--";
    }
    return new Date(value).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const downloadCsv = (filename: string, headers: string[], rows: string[]) => {
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadText = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportScheduleViewCsv = () => {
    const headers = [
      "Date",
      "Day",
      "Month",
      "Year",
      "WeekOfMonth",
      "Notes",
      "Coverage_%",
      ...activeScheduleData.teams,
    ];
    const rows = activeScheduleData.records.map((record) => {
      const workingCount = activeScheduleData.teams.filter(
        (team) => record.teams[team] === "WORKING",
      ).length;
      const coverage = activeScheduleData.teams.length
        ? ((workingCount / activeScheduleData.teams.length) * 100).toFixed(1)
        : "0.0";
      const teamStatus = activeScheduleData.teams
        .map((team) => record.teams[team])
        .join(",");
      const note = (notes[record.dateISO] || "").replace(/,/g, ";");
      return `${record.dateISO},${record.day},${record.month},${record.year},${record.weekOfMonth},"${note}",${coverage}%,${teamStatus}`;
    });
    downloadCsv(`satroster_${selectedYear}_view.csv`, headers, rows);
  };

  const exportAiracCsv = () => {
    const headers = [
      "Roster Team",
      "Source Team",
      "Revision",
      "Status",
      "Start",
      "Closeout",
      "Days",
    ];
    const rows = airacRecords.map((record) =>
      [
        record.sourceTeam,
        record.sourceTeam,
        record.revision,
        record.status,
        record.startDateISO,
        record.closeoutDateISO,
        record.cycleLength ?? "",
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(","),
    );
    downloadCsv(`satroster_airac_${selectedYear}.csv`, headers, rows);
  };

  const exportCurrentViewCsv = () => {
    if (view === "airac") {
      exportAiracCsv();
      return;
    }
    exportScheduleViewCsv();
  };

  const exportOpsBundle = () => {
    exportScheduleViewCsv();
    exportAiracCsv();

    const riskRows = upcomingAiracConflictRecords.map(
      (entry) =>
        `${entry.dateISO},${entry.starts},${entry.closeouts},${entry.workingTeams}`,
    );
    downloadCsv(
      `satroster_risk_${selectedYear}.csv`,
      ["Date", "AIRAC_Start_Events", "AIRAC_Closeout_Events", "Working_Teams"],
      riskRows,
    );

    const summaryLines = [
      `SatRoster Ops Snapshot ${selectedYear}`,
      `Generated: ${new Date().toISOString()}`,
      `Coverage: ${activeScheduleData.globalAverageCoverage.toFixed(1)}%`,
      `Critical overlaps: ${criticalDependencyCount}`,
      `AIRAC active today: ${activeAiracTodayCount}`,
      `Open notes: ${openNotesCount}`,
      `Action-required notes: ${actionRequiredNotesCount}`,
      `Load-balance score: ${loadBalanceInsight.score.toFixed(1)}`,
    ];
    downloadText(
      `satroster_ops_summary_${selectedYear}.txt`,
      summaryLines.join("\n"),
    );
  };

  const copyOpsSummary = () => {
    const summary = activeScheduleData.stats
      .map((stat) => `${stat.teamName}: ${stat.nextWorkingDate || "Done"}`)
      .join("\n");
    navigator.clipboard
      .writeText(`Ops Summary ${selectedYear}\n\n${summary}`)
      .catch(() => alert("Clipboard access failed. Copy is unavailable."));
  };

  const handleQuickJump = (value: string) => {
    if (value === "dashboard") {
      setView("dashboard");
      return;
    }
    if (value === "airac") {
      setView("airac");
      return;
    }
    if (value === "dependency") {
      setView("dependency");
      return;
    }
    if (value === "next_sat" && nextSaturdayRecord) {
      setView("dashboard");
      setSelectedDetailRecord(nextSaturdayRecord);
      return;
    }
    if (value === "risk_date" && topRiskRecord) {
      setView("dashboard");
      setSelectedDetailRecord(topRiskRecord);
      return;
    }
    if (value === "alerts") {
      setIsAlertCenterOpen(true);
      return;
    }
    if (value === "notes_action") {
      setView("dashboard");
      setNoteWorkflowFilter("action-required");
      setOnlyNotesFilter(false);
      return;
    }
    if (value === "airac_conflicts") {
      setView("airac");
    }
  };

  const alertItems = [
    scheduleSourceMode === "fallback"
      ? {
          id: "fallback",
          severity: "high" as const,
          title: "Schedule fallback in use",
          detail:
            "Static schedule dataset is unavailable. Fallback roster is active.",
          actionLabel: "Review data source",
          action: () => setIsAuditPanelOpen(true),
        }
      : null,
    yearIntegrityMismatch
      ? {
          id: "year_mismatch",
          severity: "high" as const,
          title: "Year integrity mismatch",
          detail: `Schedule year ${selectedYear}, AIRAC year ${airacResolvedYear}.`,
          actionLabel: "Open AIRAC",
          action: () => setView("airac"),
        }
      : null,
    criticalDependencyCount > 0
      ? {
          id: "critical_overlap",
          severity: "medium" as const,
          title: "Critical overlap dates detected",
          detail: `${criticalDependencyCount} dates exceed heavy dependency threshold.`,
          actionLabel: "Inspect dependency",
          action: () => setView("dependency"),
        }
      : null,
    upcomingAiracConflictRecords.length > 0
      ? {
          id: "airac_conflict",
          severity: "medium" as const,
          title: "AIRAC proximity conflicts",
          detail: `${upcomingAiracConflictRecords.length} upcoming Saturdays near AIRAC transitions.`,
          actionLabel: "Open AIRAC",
          action: () => setView("airac"),
        }
      : null,
    actionRequiredNotesCount > 0
      ? {
          id: "notes_action",
          severity: "medium" as const,
          title: "Action-required notes pending",
          detail: `${actionRequiredNotesCount} dates marked action-required.`,
          actionLabel: "Filter action notes",
          action: () => {
            setView("dashboard");
            setNoteWorkflowFilter("action-required");
            setOnlyNotesFilter(false);
          },
        }
      : null,
    isScheduleStale || isAiracStale
      ? {
          id: "stale",
          severity: "info" as const,
          title: "Data freshness warning",
          detail: `Schedule age ${scheduleAgeMinutes ?? "-"} min, AIRAC age ${airacAgeMinutes ?? "-"} min.`,
          actionLabel: "Open data audit",
          action: () => setIsAuditPanelOpen(true),
        }
      : null,
  ]
    .filter(Boolean)
    .sort((left, right) => {
      const weight = { high: 3, medium: 2, info: 1 };
      return weight[right!.severity] - weight[left!.severity];
    }) as Array<{
    id: string;
    severity: "high" | "medium" | "info";
    title: string;
    detail: string;
    actionLabel: string;
    action: () => void;
  }>;

  return (
    <PageShell>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="w-full px-6 py-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col xl:flex-row xl:items-center gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setView("dashboard")}
                  className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200 text-white"
                  type="button"
                >
                  <Calendar className="w-6 h-6" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 leading-none mb-1">
                    SatRoster
                  </h1>
                  <p className="text-xs font-medium text-slate-500">
                    Saturday Coverage Control Center
                  </p>
                </div>

                <div className="relative ml-2">
                  <select
                    value={selectedYear}
                    disabled={isYearLocked}
                    onChange={(event) => setSelectedYear(event.target.value)}
                    className={`appearance-none pl-3 pr-9 py-2 rounded-xl text-xs font-bold border border-slate-200 transition-colors ${
                      isYearLocked
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                    title={
                      isYearLocked
                        ? "Year is locked while uploaded CSV mode is active."
                        : "Select schedule year"
                    }
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year} Schedule
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <SegmentedTabs
                tabs={navItems.map((item) => ({
                  id: item.id,
                  label: item.label,
                }))}
                activeId={view}
                onChange={(id) => setView(id)}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setView("poster")}
                className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                title="Poster Preview"
                type="button"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          {isV2 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() =>
                    nextSaturdayRecord &&
                    setSelectedDetailRecord(nextSaturdayRecord)
                  }
                  type="button"
                  className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Next Saturday: {nextSaturdayRecord?.dateISO || "None"} (
                  {nextSaturdayWorkingCount}/{scopedTeams.length} working)
                </button>
                <button
                  onClick={() => setView("dashboard")}
                  type="button"
                  className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 hover:bg-blue-200"
                >
                  Coverage Now:{" "}
                  {activeScheduleData.globalAverageCoverage.toFixed(1)}%
                </button>
                <button
                  onClick={() => setView("airac")}
                  type="button"
                  className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                >
                  AIRAC Active Today: {activeAiracTodayCount}
                </button>
                <button
                  onClick={() => {
                    setView("dashboard");
                    setOnlyNotesFilter(true);
                    setNoteWorkflowFilter("ALL");
                  }}
                  type="button"
                  className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 hover:bg-amber-200"
                >
                  Open Notes: {openNotesCount}
                </button>
                <button
                  onClick={() => setView("dependency")}
                  type="button"
                  className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 hover:bg-rose-200"
                >
                  Critical Overlap: {criticalDependencyCount}
                </button>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                  Team Scope: {teamFilterMode === "all" ? "All" : "Custom"} (
                  {scopedTeams.length})
                </span>
                <button
                  onClick={() => setIsAuditPanelOpen((previous) => !previous)}
                  type="button"
                  className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  Data: {scheduleSourceMode.toUpperCase()} @
                  {formatFetchedAt(scheduleFetchedAt)} | AIRAC @
                  {formatFetchedAt(airacFetchedAt)}
                </button>
                <button
                  onClick={() => {
                    setView("dashboard");
                    setNoteWorkflowFilter("action-required");
                    setOnlyNotesFilter(false);
                  }}
                  type="button"
                  className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 hover:bg-orange-200"
                >
                  Action Notes: {actionRequiredNotesCount}
                </button>
                <button
                  onClick={() => setView("airac")}
                  type="button"
                  className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200"
                >
                  AIRAC Conflicts: {upcomingAiracConflictRecords.length}
                </button>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-100 text-cyan-700">
                  Load Balance: {loadBalanceInsight.score.toFixed(1)}
                </span>

                <button
                  onClick={() =>
                    setIsCompareModeEnabled((previous) => !previous)
                  }
                  type="button"
                  className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    isCompareModeEnabled
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                  title="Compare selected year against previous year"
                >
                  Compare Year {isCompareModeEnabled ? "ON" : "OFF"}
                </button>

                <div className="relative">
                  <button
                    onClick={() =>
                      setIsAlertCenterOpen((previous) => !previous)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    type="button"
                  >
                    Alerts ({alertItems.length})
                  </button>
                  {isAlertCenterOpen && (
                    <div className="absolute top-full right-0 mt-2 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-2 min-w-[280px] space-y-2">
                      {alertItems.length === 0 && (
                        <p className="px-3 py-2 text-xs font-semibold text-emerald-600">
                          No active alerts.
                        </p>
                      )}
                      {alertItems.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg border border-slate-100 p-2"
                        >
                          <p className="text-xs font-bold text-slate-800">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            {item.detail}
                          </p>
                          <button
                            onClick={() => {
                              item.action();
                              setIsAlertCenterOpen(false);
                            }}
                            type="button"
                            className="mt-2 text-[11px] font-bold text-blue-600 hover:text-blue-700"
                          >
                            {item.actionLabel}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <select
                    ref={quickJumpRef}
                    defaultValue=""
                    onChange={(event) => {
                      handleQuickJump(event.target.value);
                      event.target.value = "";
                    }}
                    className="appearance-none pl-3 pr-8 py-1.5 rounded-lg text-[11px] font-bold border border-slate-200 bg-white text-slate-700"
                    title="Keyboard: / to focus, g d, g a, g n"
                  >
                    <option value="" disabled>
                      Quick Jump
                    </option>
                    <option value="dashboard">Dashboard</option>
                    <option value="airac">AIRAC</option>
                    <option value="dependency">Dependency</option>
                    <option value="next_sat">Next Saturday Detail</option>
                    <option value="risk_date">Top Risk Date</option>
                    <option value="notes_action">Action Notes</option>
                    <option value="airac_conflicts">AIRAC Conflicts</option>
                    <option value="alerts">Alert Center</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                <div className="relative">
                  <button
                    onClick={() => setIsExportMenuOpen((previous) => !previous)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    type="button"
                  >
                    <Download className="w-3.5 h-3.5" />
                    One-Click Export
                  </button>
                  {isExportMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-2 min-w-[220px]">
                      <button
                        onClick={() => {
                          exportOpsBundle();
                          setIsExportMenuOpen(false);
                        }}
                        type="button"
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Export Ops Bundle
                      </button>
                      <button
                        onClick={() => {
                          exportCurrentViewCsv();
                          setIsExportMenuOpen(false);
                        }}
                        type="button"
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Export Current View CSV
                      </button>
                      <button
                        onClick={() => {
                          copyOpsSummary();
                          setIsExportMenuOpen(false);
                        }}
                        type="button"
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Copy Ops Summary
                      </button>
                      <button
                        onClick={() => {
                          setView("poster");
                          setIsExportMenuOpen(false);
                        }}
                        type="button"
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Open Poster View
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
                {nextFourSaturdayRecords.map((entry) => (
                  <button
                    key={entry.record.dateISO}
                    onClick={() => {
                      setView("dashboard");
                      setSelectedDetailRecord(entry.record);
                    }}
                    type="button"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left hover:border-blue-200 hover:shadow-sm transition-all"
                  >
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Next Slot
                    </p>
                    <p className="text-sm font-bold text-slate-900 mt-1">
                      {entry.record.dateISO}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-600">
                      {entry.working}/{scopedTeams.length} working •{" "}
                      {entry.risk}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isV2 && yearIntegrityMismatch && (
            <div className="flex items-center gap-2 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4" />
              <span>
                Year Integrity: schedule is {selectedYear}, AIRAC resolved to{" "}
                {airacResolvedYear}.
              </span>
            </div>
          )}

          {isV2 && isCompareModeEnabled && compareSnapshot && (
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
              <span>
                Compare vs {compareSnapshot.compareYear}: coverage{" "}
                {compareCoverageDelta !== null
                  ? `${compareCoverageDelta >= 0 ? "+" : ""}${compareCoverageDelta.toFixed(1)}%`
                  : "n/a"}
              </span>
              <span>
                Heavy overlaps{" "}
                {compareHeavyDelta !== null
                  ? `${compareHeavyDelta >= 0 ? "+" : ""}${compareHeavyDelta}`
                  : "n/a"}
              </span>
              <span>
                AIRAC density{" "}
                {compareAiracDelta !== null
                  ? `${compareAiracDelta >= 0 ? "+" : ""}${compareAiracDelta}`
                  : "n/a"}
              </span>
              <span>
                Avg team shifts {compareSnapshot.avgTeamWorking.toFixed(1)} over{" "}
                {compareSnapshot.totalSaturdays} Saturdays
              </span>
            </div>
          )}

          {isV2 && isCompareModeEnabled && compareWarning && (
            <div className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {compareWarning}
            </div>
          )}

          {isV2 && isAuditPanelOpen && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                  Data Audit
                </p>
                <button
                  type="button"
                  onClick={() => setIsAuditPanelOpen(false)}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-700"
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 text-xs font-semibold text-slate-700">
                <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
                  Schedule Source: {scheduleSourceMode.toUpperCase()}
                </div>
                <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
                  Schedule Age: {scheduleAgeMinutes ?? "-"} min
                </div>
                <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
                  AIRAC Age: {airacAgeMinutes ?? "-"} min
                </div>
                <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
                  Fetched: S {formatFetchedAt(scheduleFetchedAt)} | A{" "}
                  {formatFetchedAt(airacFetchedAt)}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 w-full px-6 py-8 flex flex-col lg:flex-row gap-8">
        {view === "dashboard" && (
          <aside className="lg:w-80 flex-shrink-0">
            <div className="lg:sticky lg:top-28 space-y-6">
              {uploadError && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs font-semibold">
                  {uploadError}
                </div>
              )}

              {scheduleWarning && (
                <div
                  className={`p-4 rounded-2xl text-xs font-semibold border ${
                    scheduleSourceMode === "fallback"
                      ? "bg-amber-50 border-amber-100 text-amber-700"
                      : scheduleSourceMode === "uploaded"
                        ? "bg-blue-50 border-blue-100 text-blue-700"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  {scheduleWarning}
                </div>
              )}

              <TeamFilterSidebar
                teams={data.teams}
                selectedTeams={selectedTeams}
                teamFilterMode={teamFilterMode}
                onToggleTeam={handleToggleTeam}
                onSelectAll={handleSelectAllTeams}
                onDeselectAll={handleDeselectAllTeams}
              />

              <ScheduleFilterPanel
                availableMonths={data.months}
                selectedMonths={selectedMonths}
                selectedSaturday={selectedSaturday}
                saturdayDropdownOptions={saturdayDropdownOptions}
                statusFilter={statusFilter}
                onlyNotesFilter={onlyNotesFilter}
                noteWorkflowFilter={noteWorkflowFilter}
                showNoteWorkflowFilter={isV2}
                activeFilterCount={activeFilterCount}
                onMonthChange={handleMonthFilterChange}
                onSaturdayChange={setSelectedSaturday}
                onStatusChange={setStatusFilter}
                onOnlyNotesChange={setOnlyNotesFilter}
                onNoteWorkflowChange={setNoteWorkflowFilter}
                onResetFilters={resetFilters}
              />
            </div>
          </aside>
        )}

        <div className="flex-1 min-w-0">
          {isV2 && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Load Balance Score
                </p>
                <p className="text-lg font-black text-slate-900 mt-1">
                  {loadBalanceInsight.score.toFixed(1)}
                </p>
                <p className="text-[11px] font-semibold text-slate-500">
                  sigma {loadBalanceInsight.stdDev.toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Overloaded Team
                </p>
                <p className="text-sm font-bold text-rose-700 mt-1">
                  {loadBalanceInsight.max?.team || "N/A"}
                </p>
                <p className="text-[11px] font-semibold text-slate-500">
                  {loadBalanceInsight.max?.value ?? 0} working Saturdays
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Underused Team
                </p>
                <p className="text-sm font-bold text-emerald-700 mt-1">
                  {loadBalanceInsight.min?.team || "N/A"}
                </p>
                <p className="text-[11px] font-semibold text-slate-500">
                  {loadBalanceInsight.min?.value ?? 0} working Saturdays
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Note Workflow
                </p>
                <p className="text-sm font-bold text-slate-800 mt-1">
                  {noteWorkflowCounts.note} note /{" "}
                  {noteWorkflowCounts["action-required"]} action /{" "}
                  {resolvedNotesCount} resolved
                </p>
                <p className="text-[11px] font-semibold text-slate-500">
                  {noteWorkflowCounts.none} without annotation
                </p>
              </div>
            </div>
          )}

          {view === "airac" && airacWarning && (
            <div className="mb-6 p-4 rounded-2xl text-xs font-medium border bg-indigo-50 border-indigo-100 text-indigo-700">
              {airacWarning}
            </div>
          )}

          {view === "dashboard" && (
            <Dashboard
              data={activeScheduleData}
              selectedYear={selectedYear}
              onViewDetail={setSelectedDetailRecord}
              isEnhancedMode={isV2}
              onSelectMonth={(month) => {
                setSelectedMonths([month]);
                setSelectedSaturday("ALL");
              }}
              onFocusTeam={(team) => {
                setTeamFilterMode("custom");
                setSelectedTeams([team]);
              }}
              compareSnapshot={
                isV2 && isCompareModeEnabled && compareSnapshot
                  ? {
                      compareYear: compareSnapshot.compareYear,
                      coverageDelta: compareCoverageDelta ?? 0,
                      heavyDelta: compareHeavyDelta ?? 0,
                    }
                  : null
              }
              upcomingAiracConflicts={
                isV2 ? upcomingAiracConflictRecords.slice(0, 6) : []
              }
            />
          )}
          {view === "table" && (
            <ScheduleTable
              records={activeScheduleData.records}
              teams={activeScheduleData.teams}
              notes={notes}
              noteStatuses={noteWorkflowByDate}
              showNoteStatus={isV2}
              onViewDetail={setSelectedDetailRecord}
            />
          )}
          {view === "planner" && (
            <YearlyPlanner
              data={activeScheduleData}
              notes={notes}
              selectedYear={selectedYear}
            />
          )}
          {view === "dependency" && (
            <DependencyFinder
              data={activeScheduleData}
              highlightDates={
                isV2
                  ? upcomingAiracConflictRecords.map((item) => item.dateISO)
                  : []
              }
              enhancedMode={isV2}
            />
          )}
          {view === "airac" && (
            <AiracInsights
              records={airacRecords}
              selectedYear={selectedYear}
              resolvedYear={airacResolvedYear}
              availableYears={airacAvailableYears}
            />
          )}
          {view === "poster" && (
            <YearPoster data={data} onExit={() => setView("planner")} />
          )}
          {view === "guide" && <FeatureGuide />}
        </div>
      </main>

      <footer className="mt-auto border-t border-slate-200 bg-white py-8 px-6">
        <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 text-sm">
          <p>(c) 2026 SatRoster. Saturday Coverage Control Center</p>
          <div className="flex gap-6 font-medium text-xs">
            <span>Safety Manual</span>
            <span>Roster Policy</span>
            <span>IT Support</span>
          </div>
        </div>
      </footer>

      {selectedDetailRecord && (
        <DayDetailDrawer
          record={selectedDetailRecord}
          teams={data.teams}
          note={notes[selectedDetailRecord.dateISO] || ""}
          noteStatus={
            noteWorkflowByDate[selectedDetailRecord.dateISO] ||
            (notes[selectedDetailRecord.dateISO]?.trim() ? "note" : "none")
          }
          enableNoteWorkflow={isV2}
          onClose={() => setSelectedDetailRecord(null)}
          onSaveNote={(content) =>
            handleSaveNote(selectedDetailRecord.dateISO, content)
          }
          onSaveNoteStatus={(status) =>
            handleSaveNoteWorkflow(selectedDetailRecord.dateISO, status)
          }
        />
      )}

      <AssistantChat
        data={data}
        scopeTeams={teamFilterMode === "all" ? data.teams : selectedTeams}
      />
    </PageShell>
  );
};

export default App;
