import { TIMEZONE } from './constants';
import { ScheduleRecord, ScheduleData, TeamStats, Status } from './types';

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function processScheduleData(csvInput: string): ScheduleData {
  const lines = csvInput.split('\n').filter(l => l.trim() !== '');
  if (lines.length === 0) {
    throw new Error('CSV input is empty.');
  }
  const headers = parseCSVLine(lines[0]);
  
  const teamNames = headers.slice(5).map(t => t.replace(/^"|"$/g, ''));
  const records: ScheduleRecord[] = [];
  const months = new Set<string>();

  const now = new Date(new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE }).format(new Date()));
  const nowISO = now.toISOString().split('T')[0];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const record: ScheduleRecord = {
      dateISO: values[0],
      day: values[1],
      month: values[2],
      year: values[3],
      weekOfMonth: parseInt(values[4]),
      teams: {}
    };
    months.add(record.month);
    teamNames.forEach((name, idx) => {
      record.teams[name] = values[5 + idx] as Status;
    });
    records.push(record);
  }

  const sortedMonths = Array.from(months);
  let totalWorkingShiftsCount = 0;

  const stats: TeamStats[] = teamNames.map(team => {
    const workingDays = records.filter(r => r.teams[team] === 'WORKING');
    const nextWorking = workingDays.find(r => r.dateISO >= nowISO);
    const monthlyCounts: { [m: string]: number } = {};
    sortedMonths.forEach(m => {
      monthlyCounts[m] = workingDays.filter(r => m === r.month).length;
    });
    
    const availabilityPercentage = (workingDays.length / records.length) * 100;
    totalWorkingShiftsCount += workingDays.length;

    return { 
      teamName: team, 
      totalWorking: workingDays.length, 
      availabilityPercentage,
      nextWorkingDate: nextWorking ? nextWorking.dateISO : null, 
      monthlyCounts 
    };
  });

  const globalAverageCoverage = (totalWorkingShiftsCount / (records.length * teamNames.length)) * 100;

  return { records, teams: teamNames, months: sortedMonths, stats, globalAverageCoverage };
}
