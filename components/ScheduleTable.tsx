import React, { useState, useMemo } from 'react';
import { ScheduleRecord, NoteRecord } from '../types';
import { Download, Copy, Check, StickyNote } from 'lucide-react';
import { SectionCard } from './ui/DesignSystem';

interface ScheduleTableProps {
  records: ScheduleRecord[];
  teams: string[];
  notes: NoteRecord;
  noteStatuses?: Record<string, "note" | "action-required" | "resolved">;
  showNoteStatus?: boolean;
  onViewDetail: (r: ScheduleRecord) => void;
}

export const ScheduleTable: React.FC<ScheduleTableProps> = ({
  records,
  teams,
  notes,
  noteStatuses = {},
  showNoteStatus = false,
  onViewDetail,
}) => {
  const [copiedRow, setCopiedRow] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const exportCSV = () => {
    const headers = ['Date', 'Day', 'Month', 'Year', 'WeekOfMonth', 'Notes', 'Coverage_%', ...teams].join(',');
    const rows = records.map(r => {
      const workingCount = teams.filter(t => r.teams[t] === 'WORKING').length;
      const coverage = ((workingCount / teams.length) * 100).toFixed(1);
      const teamStatus = teams.map(t => r.teams[t]).join(',');
      const note = (notes[r.dateISO] || '').replace(/,/g, ';');
      return `${r.dateISO},${r.day},${r.month},${r.year},${r.weekOfMonth},"${note}",${coverage}%,${teamStatus}`;
    });
    const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `satroster_${records[0]?.year || "schedule"}_full.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filterDefinitions = [
    {
      key: 'notes',
      label: 'Has Notes',
      predicate: (record: ScheduleRecord) => !!notes[record.dateISO],
    },
    {
      key: 'high',
      label: 'High Coverage',
      predicate: (_: ScheduleRecord, coverage: number) => coverage >= 70,
    },
    {
      key: 'light',
      label: 'Light Coverage',
      predicate: (_: ScheduleRecord, coverage: number) => coverage <= 40,
    },
  ];

  const filteredRecords = useMemo(() => {
    if (activeFilter === 'all') return records;
    const selectedDefinition = filterDefinitions.find((f) => f.key === activeFilter);
    if (!selectedDefinition) return records;
    return records.filter((record) => {
      const workingCount = teams.filter((t) => record.teams[t] === 'WORKING').length;
      const coveragePct = (workingCount / teams.length) * 100;
      return selectedDefinition.predicate(record, coveragePct);
    });
  }, [records, teams, activeFilter]);

  const copyRow = (r: ScheduleRecord) => {
    const workingCount = teams.filter(t => r.teams[t] === 'WORKING').length;
    const coverage = ((workingCount / teams.length) * 100).toFixed(0);
    const summary = `Saturday ${r.dateISO} (Week ${r.weekOfMonth})\nCoverage: ${coverage}%\n\n` +
      teams.map(t => `- ${t}: ${r.teams[t]}`).join('\n') +
      (notes[r.dateISO] ? `\n\nNotes: ${notes[r.dateISO]}` : '');
    navigator.clipboard
      .writeText(summary)
      .then(() => {
        setCopiedRow(r.dateISO);
        setTimeout(() => setCopiedRow(null), 2000);
      })
      .catch(() => {
        setCopiedRow(null);
        alert("Clipboard access failed. Copy is unavailable.");
      });
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Registry View</p>
          <h2 className="text-2xl font-bold text-slate-900">Shift Registry</h2>
          <p className="text-sm text-slate-500">{filteredRecords.length} dates visible after filters</p>
        </div>
        <button 
          onClick={exportCSV}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg"
          type="button"
        >
          <Download size={18} />
          <span>Export Archive</span>
        </button>
      </div>
      <div className="max-w-xs">
        <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
          Quick Filter
        </label>
        <div className="relative">
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 hover:bg-slate-100 transition-colors"
          >
            <option value="all">All Records</option>
            {filterDefinitions.map((filter) => (
              <option key={filter.key} value={filter.key}>
                {filter.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
            ▾
          </span>
        </div>
      </div>

      <SectionCard className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 sticky left-0 z-10 bg-slate-50">Date</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Week</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Coverage</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Note</th>
              {teams.map(t => (
                <th key={t} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 min-w-[120px]">{t}</th>
              ))}
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRecords.map(record => {
              const workingCount = teams.filter(t => record.teams[t] === 'WORKING').length;
              const coveragePct = (workingCount / teams.length) * 100;
              
              return (
                <tr 
                  key={record.dateISO} 
                  className="group hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => onViewDetail(record)}
                >
                  <td className="px-6 py-4 sticky left-0 z-10 bg-white group-hover:bg-slate-50">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-slate-800">{record.dateISO}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{record.month}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-[10px] font-black text-slate-600">
                      {record.weekOfMonth}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                     <div className="flex flex-col items-center">
                        <span className={`text-[10px] font-black ${coveragePct > 50 ? 'text-blue-600' : 'text-slate-400'}`}>
                           {coveragePct.toFixed(0)}%
                        </span>
                        <div className="w-8 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                           <div className="h-full bg-blue-600" style={{ width: `${coveragePct}%` }} />
                        </div>
                     </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      {notes[record.dateISO] ? (
                        <StickyNote size={16} className="text-amber-500 mx-auto" />
                      ) : (
                        <span className="text-slate-200">-</span>
                      )}
                      {showNoteStatus && (
                        <span
                          className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            noteStatuses[record.dateISO] === "action-required"
                              ? "bg-orange-100 text-orange-700"
                              : noteStatuses[record.dateISO] === "resolved"
                                ? "bg-emerald-100 text-emerald-700"
                                : noteStatuses[record.dateISO] === "note"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {noteStatuses[record.dateISO] || "none"}
                        </span>
                      )}
                    </div>
                  </td>
                  {teams.map(t => {
                    const status = record.teams[t];
                    return (
                      <td key={t} className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          status === 'WORKING' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-slate-100 text-slate-400'
                        }`}>
                          {status}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={(e) => { e.stopPropagation(); copyRow(record); }}
                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all"
                      type="button"
                    >
                      {copiedRow === record.dateISO ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
};

