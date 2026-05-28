import React from "react";

const cx = (...parts: Array<string | undefined | false | null>) =>
  parts.filter(Boolean).join(" ");

interface WrapperProps {
  children: React.ReactNode;
  className?: string;
}

export const PageShell: React.FC<WrapperProps> = ({ children, className }) => (
  <div className={cx("min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col", className)}>
    {children}
  </div>
);

export const SectionCard: React.FC<WrapperProps> = ({ children, className }) => (
  <section className={cx("bg-white rounded-2xl border border-slate-200 shadow-sm", className)}>
    {children}
  </section>
);

export const SidebarCard: React.FC<WrapperProps> = ({ children, className }) => (
  <div className={cx("bg-white rounded-2xl border border-slate-200 shadow-sm p-6", className)}>
    {children}
  </div>
);

type StatusRow = {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
};

interface StatusCardProps {
  title?: string;
  rows: StatusRow[];
  footer?: React.ReactNode;
  className?: string;
}

export const StatusCard: React.FC<StatusCardProps> = ({
  title = "Sync Status",
  rows,
  footer,
  className,
}) => (
  <div
    className={cx(
      "bg-slate-900 p-5 rounded-2xl text-white shadow-xl relative overflow-hidden",
      className,
    )}
  >
    <div className="relative z-10 space-y-3">
      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
        {title}
      </h4>
      <div className="space-y-2.5 text-xs">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between items-center">
            <span className="text-slate-300">{row.label}</span>
            <span className={cx("font-bold", row.valueClassName)}>{row.value}</span>
          </div>
        ))}
      </div>
      {footer && <div className="pt-2 border-t border-slate-700">{footer}</div>}
    </div>
    <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-blue-500/20 blur-2xl" />
  </div>
);

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  toneClassName?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon: Icon,
  toneClassName = "text-slate-700 bg-slate-50 border-slate-200",
  className,
}) => (
  <article className={cx("border rounded-2xl p-4 shadow-sm", toneClassName, className)}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
          {label}
        </p>
        <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
      </div>
      {Icon ? <Icon className="w-5 h-5 opacity-70" /> : null}
    </div>
  </article>
);

interface SegmentedTabItem<T extends string> {
  id: T;
  label: string;
}

interface SegmentedTabsProps<T extends string> {
  tabs: ReadonlyArray<SegmentedTabItem<T>>;
  activeId: string;
  onChange: (id: T) => void;
  className?: string;
}

export function SegmentedTabs<T extends string>({
  tabs,
  activeId,
  onChange,
  className,
}: SegmentedTabsProps<T>) {
  return (
    <div className={cx("flex bg-slate-200 p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          type="button"
          className={cx(
            "flex-1 sm:flex-none px-5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
            activeId === tab.id
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
