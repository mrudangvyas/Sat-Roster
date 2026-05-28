import { ScheduleRecord } from './types';

export function generateICS(teamName: string, records: ScheduleRecord[]): string {
  const workingRecords = records.filter(r => r.teams[teamName] === 'WORKING');
  const scheduleYear = records[0]?.year || 'schedule';
  const domainYear = scheduleYear.replace(/\D/g, '') || 'schedule';
  
  let icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//SatRoster ${scheduleYear}//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  workingRecords.forEach(r => {
    const startDate = new Date(r.dateISO);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1); // DTEND is exclusive

    const dtStart = startDate.toISOString().split('T')[0].replace(/-/g, '');
    const dtEnd = endDate.toISOString().split('T')[0].replace(/-/g, '');

    icsLines.push('BEGIN:VEVENT');
    icsLines.push(`UID:${dtStart}-${teamName.replace(/\s+/g, '')}@satroster${domainYear}.local`);
    icsLines.push(`DTSTAMP:${dtStart}T000000Z`);
    icsLines.push(`DTSTART;VALUE=DATE:${dtStart}`);
    icsLines.push(`DTEND;VALUE=DATE:${dtEnd}`);
    icsLines.push(`SUMMARY:WORKING Saturday (${teamName})`);
    icsLines.push(`DESCRIPTION:Standard Saturday working shift scheduled via SatRoster ${scheduleYear}.`);
    icsLines.push('STATUS:CONFIRMED');
    icsLines.push('END:VEVENT');
  });

  icsLines.push('END:VCALENDAR');
  return icsLines.join('\r\n');
}

export function downloadICS(teamName: string, records: ScheduleRecord[]) {
  const scheduleYear = records[0]?.year || 'schedule';
  const content = generateICS(teamName, records);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${teamName.replace(/\s+/g, '_')}_${scheduleYear}_Schedule.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
