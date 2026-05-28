import React from 'react';

export const FeatureGuide: React.FC = () => {
  const cards = [
    {
      title: 'Dashboard',
      description: 'Live cards surface the next five Saturdays, team coverage status, and day-level details for fast operational review.',
      steps: ['Hover or tap a card to open the detail drawer.', 'Use the Copy Team Sync button to share dates with the crew.'],
    },
    {
      title: 'Details & Filters',
      description: 'Dashboard hosts the shared filter workspace for month, date, status, notes, and team scope.',
      steps: ['Open the Dashboard tab and adjust filters from the Teams panel and Dashboard Filters card.', 'The same filter set flows through Dashboard, Dependency, and AIRAC views.'],
    },
    {
      title: 'AIRAC',
      description: 'AIRAC view shows source-team cycle records with timeline and analytics tabs.',
      steps: ['Use AIRAC filters to narrow by source team, status, and revision.', 'Use timeline cards to review revision windows by month.'],
    },
    {
      title: 'Dependency Finder',
      description: 'Compose team bundles to see overlapping Saturdays and evaluate coordination windows.',
      steps: ['Toggle between Intersection and Threshold modes to adjust the dependency logic.', 'Click the export button to download a CSV summary.'],
    },
    {
      title: 'Data Controls',
      description: 'Upload a replacement CSV, restore defaults, switch years, and open poster preview from the top header.',
      steps: ['Use Upload New CSV when a revised roster file is received.', 'Use the printer icon to open poster preview and print/export as PDF.'],
    },
    {
      title: 'Ask Assistant',
      description: 'Quick helper for simple schedule lookups within the currently loaded data and team scope.',
      steps: ['Ask by date in YYYY-MM-DD format for a working/off summary.', 'Use prompts like "next saturday" or "summary" for quick status checks.'],
    },
  ];

  const glossary = [
    {
      term: 'AIRAC',
      meaning: 'A fixed aviation information cycle used to time updates.',
    },
    {
      term: 'NON-AIRAC',
      meaning: 'A change/update window that is outside the AIRAC cycle.',
    },
    {
      term: 'Revision',
      meaning: 'Version identifier for an AIRAC record.',
    },
    {
      term: 'Closeout',
      meaning: 'The end date for an AIRAC cycle record.',
    },
    {
      term: 'Dependency',
      meaning: 'When multiple teams must be available together on the same Saturday.',
    },
    {
      term: 'Intersection Mode',
      meaning: 'Only dates where all selected teams are WORKING.',
    },
    {
      term: 'Threshold Mode',
      meaning: 'Dates where at least N selected teams are WORKING.',
    },
    {
      term: 'Matrix View',
      meaning: 'Week-by-week calendar blocks for fast visual checking.',
    },
    {
      term: 'Coverage',
      meaning: 'How many teams are WORKING on a Saturday as a percentage.',
    },
    {
      term: 'Critical Overlap',
      meaning: 'A high-load Saturday where many teams are WORKING together.',
    },
    {
      term: 'Fallback Data',
      meaning: 'Backup schedule data shown when live API data is unavailable.',
    },
    {
      term: 'NFP+NOTAM+AODB',
      meaning: 'A combined source team label used in the Saturday roster.',
    },
    {
      term: 'Charts + Minima+Mint+ENR',
      meaning: 'A combined source team label used in the Saturday roster.',
    },
  ];

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom duration-700">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
          Product Guide
        </p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          SatRoster Feature Guide
        </h2>
        <p className="text-slate-500 mt-1">
          A quick tour of every view plus the filters that keep them in sync.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {cards.map((card) => (
          <article key={card.title} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
              Guidance
            </p>
            <h3 className="text-xl font-bold text-slate-900">{card.title}</h3>
            <p className="text-slate-600">{card.description}</p>
            <ul className="space-y-2 text-sm font-semibold text-slate-500 list-disc list-inside">
              {card.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            Glossary
          </p>
          <h3 className="mt-1 text-2xl font-bold text-slate-900">
            Common Terms
          </h3>
          <p className="text-slate-500 mt-1">
            Quick meanings for terms used across Dashboard, AIRAC, and Dependency views.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {glossary.map((item) => (
            <div
              key={item.term}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
            >
              <p className="text-sm font-black text-slate-900">{item.term}</p>
              <p className="text-xs font-medium text-slate-600 mt-1">{item.meaning}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


