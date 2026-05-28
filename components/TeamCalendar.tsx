
import React from 'react';
import { ScheduleRecord } from '../types';

export const TeamCalendar: React.FC<{ teamName: string, records: ScheduleRecord[] }> = ({ teamName, records }) => {
  const months = Array.from(new Set(records.map(r => r.month)));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-5 text-[11px] font-semibold text-slate-600">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded bg-blue-600 border border-blue-600" />
          <span>Working</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {months.map(m => {
          const monthRecords = records.filter(r => r.month === m);
          return (
            <div key={m} className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-[0.3em]">{m}</h4>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map(w => {
                  const rec = monthRecords.find(r => r.weekOfMonth === w);
                  const isWorking = rec && rec.teams[teamName] === 'WORKING';
                  return (
                    <div key={w} className={`h-12 rounded-xl border flex flex-col items-center justify-center transition-all ${
                      isWorking 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20' 
                      : 'bg-white text-slate-400 border-slate-200 opacity-60'
                    }`}>
                      <span className="text-[10px] font-black">W{w}</span>
                      <span className="text-xs font-bold leading-none">{rec ? rec.dateISO.split('-')[2] : '--'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
