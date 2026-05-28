
import React from 'react';
import { ScheduleData } from '../types';
import { Printer, X } from 'lucide-react';

export const YearPoster: React.FC<{ data: ScheduleData; onExit: () => void }> = ({
  data,
  onExit,
}) => {
  const scheduleYear = data.records[0]?.year || "Schedule";

  const handlePrint = () => {
    document.title = `SatRoster-${scheduleYear}-Poster`;
    window.print();
    setTimeout(() => {
      document.title = 'SatRoster';
    }, 500);
  };

  return (
    <div className="space-y-6 print:block print-only">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            Printable Layout
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-900">Poster Preview</h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-slate-900 text-white rounded-xl font-bold flex items-center space-x-2 hover:bg-slate-800 transition-colors"
            type="button"
          >
            <Printer size={18} />
            <span>Print Poster</span>
          </button>
          <button onClick={onExit} className="p-2 hover:bg-slate-100 rounded-xl" type="button">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* The Actual Poster */}
      <div className="bg-white p-8 md:p-12 text-slate-950 border border-slate-200 rounded-2xl shadow-xl print:shadow-none print:border-none print:p-0 print:rounded-none mx-auto max-w-[1200px]">
        <div className="text-center mb-10 border-b-4 border-slate-950 pb-6">
            <h1 className="text-5xl font-black uppercase tracking-tighter">{scheduleYear} Saturday Schedule</h1>
            <p className="text-lg font-bold tracking-widest uppercase mt-2">Operational Stream Distribution Matrix</p>
        </div>

        <div className="grid grid-cols-3 gap-8">
            {data.months.map(m => (
                <div key={m} className="space-y-3">
                    <h3 className="text-xl font-black border-b-2 border-slate-900 pb-1 uppercase">{m}</h3>
                    <div className="space-y-2">
                        {data.records.filter(r => r.month === m).map(r => (
                            <div key={r.dateISO} className="text-[10px] flex justify-between border-b border-slate-100 pb-1">
                                <span className="font-bold w-12">{r.dateISO.split('-')[2]} Sat</span>
                                <div className="flex-1 flex flex-wrap gap-1 justify-end">
                                    {data.teams.map(t => r.teams[t] === 'WORKING' && (
                                        <span key={t} className="px-1 bg-slate-900 text-white leading-none pt-0.5">{t.charAt(0)}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>

        <div className="mt-12 pt-6 border-t-2 border-slate-200 grid grid-cols-3 text-[10px] uppercase font-bold">
            {data.teams.map(t => (
                <div key={t} className="flex items-center space-x-2">
                    <span className="w-5 h-5 bg-slate-900 text-white flex items-center justify-center">{t.charAt(0)}</span>
                    <span>{t}</span>
                </div>
            ))}
        </div>
      </div>
      <style>{`
        @media print {
            body * { visibility: hidden; }
            .print\\:block, .print\\:block * { visibility: visible; }
            .print-only { visibility: visible; }
            #root > div > main > div:last-child { visibility: visible; position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
};
