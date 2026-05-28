import React, { useState } from 'react';
import { ScheduleRecord } from '../types';
import { 
  ChevronRight, 
  Share2, 
  StickyNote, 
  Copy, 
  Check, 
  Mail, 
  MessageCircle,
  Clock
} from 'lucide-react';

interface DayDetailDrawerProps {
  record: ScheduleRecord;
  teams: string[];
  note: string;
  noteStatus?: "none" | "note" | "action-required" | "resolved";
  enableNoteWorkflow?: boolean;
  onClose: () => void;
  onSaveNote: (note: string) => void;
  onSaveNoteStatus?: (status: "none" | "note" | "action-required" | "resolved") => void;
}

export const DayDetailDrawer: React.FC<DayDetailDrawerProps> = ({
  record,
  teams,
  note,
  noteStatus = "none",
  enableNoteWorkflow = false,
  onClose,
  onSaveNote,
  onSaveNoteStatus,
}) => {
  const [localNote, setLocalNote] = useState(note);
  const [localNoteStatus, setLocalNoteStatus] = useState(noteStatus);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  React.useEffect(() => {
    setLocalNote(note);
  }, [note]);

  React.useEffect(() => {
    setLocalNoteStatus(noteStatus);
  }, [noteStatus]);

  const handleCopy = (type: 'short' | 'detailed' | 'formal') => {
    let text = '';
    const workingTeams = teams.filter(t => record.teams[t] === 'WORKING');

    if (type === 'short') {
      text = `Saturday ${record.dateISO}: ${workingTeams.join(', ')}`;
    } else if (type === 'detailed') {
      text = `SATURDAY SHIFT: ${record.dateISO}\nWeek: ${record.weekOfMonth}\nMonth: ${record.month}\n\nWorking Teams:\n${workingTeams.map(t => `- ${t}`).join('\n')}`;
    } else {
      text = `Subject: Saturday Shift Schedule - ${record.dateISO}\n\nDear Team,\n\nPlease find the working roster for Saturday, ${record.dateISO} (Week ${record.weekOfMonth}):\n\n${workingTeams.map(t => `- ${t}: WORKING`).join('\n')}\n\nRegards,\nSatRoster Operations`;
    }

    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
      })
      .catch(() => {
        setCopied(null);
        alert("Clipboard access failed. Copy is unavailable.");
      });
  };

  const noteChanged = localNote !== note;
  const statusChanged = localNoteStatus !== noteStatus;
  const hasWorkflowEdits = enableNoteWorkflow && statusChanged;

  const handleSaveEdits = () => {
    if (noteChanged) {
      onSaveNote(localNote);
    }
    if (hasWorkflowEdits && onSaveNoteStatus) {
      onSaveNoteStatus(localNoteStatus);
    }
  };

  return (
    <div className="fixed inset-0 z-50 print:hidden">
      <div className="absolute inset-0 bg-slate-900/35" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl animate-in slide-in-from-right duration-300 p-8 flex flex-col border-l border-slate-200">
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center space-x-2 text-blue-600 mb-1">
               <Clock size={16} />
               <span className="text-[10px] font-black uppercase tracking-[0.28em]">Shift Detail</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900">{record.dateISO}</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Sat, Week {record.weekOfMonth}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full" type="button">
            <ChevronRight size={24} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto no-scrollbar">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-slate-500">
              <StickyNote size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Internal Notes</span>
            </div>
            <textarea 
              value={localNote}
              onChange={(e) => setLocalNote(e.target.value)}
              placeholder="Add shift specific notes (e.g. Planned release, system maintenance)..."
              className="w-full h-24 p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm placeholder:text-slate-400"
            />
            {enableNoteWorkflow && (
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  Annotation State
                </label>
                <select
                  value={localNoteStatus}
                  onChange={(event) =>
                    setLocalNoteStatus(
                      event.target.value as "none" | "note" | "action-required" | "resolved",
                    )}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="none">No Annotation</option>
                  <option value="note">Note</option>
                  <option value="action-required">Action Required</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            )}
            {(noteChanged || hasWorkflowEdits) && (
              <button
                onClick={handleSaveEdits}
                className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all"
                type="button"
              >
                Save Annotation
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-slate-500">
              <Share2 size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Team Status</span>
            </div>
            <div className="space-y-2">
              {teams.map(t => {
                const status = record.teams[t];
                return (
                  <div key={t} className={`p-4 rounded-2xl border transition-all ${status === 'WORKING' ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm truncate pr-4 text-slate-800">{t}</span>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase shrink-0 ${status === 'WORKING' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-200 relative">
          {showShareOptions && (
            <div className="absolute bottom-full left-0 right-0 mb-4 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 space-y-1 animate-in slide-in-from-bottom-2">
              {[
                { id: 'short', icon: MessageCircle, label: 'WhatsApp / Short' },
                { id: 'detailed', icon: Copy, label: 'Detailed Summary' },
                { id: 'formal', icon: Mail, label: 'Formal Email' }
              ].map(opt => (
                <button 
                  key={opt.id}
                  onClick={() => handleCopy(opt.id as any)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 rounded-xl transition-all"
                  type="button"
                >
                  <div className="flex items-center space-x-3">
                    <opt.icon size={16} className="text-slate-400" />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </div>
                  {copied === opt.id ? <Check size={14} className="text-blue-600" /> : <ChevronRight size={14} className="text-slate-300" />}
                </button>
              ))}
            </div>
          )}
          <button 
            onClick={() => setShowShareOptions(!showShareOptions)}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-all"
            type="button"
          >
            <Share2 size={18} />
            <span>Quick Share Templates</span>
          </button>
        </div>
      </div>
    </div>
  );
};
