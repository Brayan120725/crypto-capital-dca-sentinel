import React from 'react';
import { DecisionState } from '../types';
import { DecisionBadge } from './DecisionBadge';

export interface MetricCardSubItem {
  label: string;
  value: string;
  tone?: 'default' | 'emerald' | 'crimson' | 'amber' | 'yellow' | 'purple';
}

interface MetricCardProps {
  id?: string;
  code: string;
  title: string;
  primaryValue: string;
  unitLabel?: string;
  deltaPct?: number;
  deltaLabel?: string;
  badgeState?: DecisionState;
  accentColor?: 'emerald' | 'crimson' | 'amber' | 'yellow' | 'purple' | 'zinc';
  progressPct?: number;
  progressLeftLabel?: string;
  progressRightLabel?: string;
  metrics: MetricCardSubItem[];
  footerNote: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  id,
  code,
  title,
  primaryValue,
  unitLabel,
  deltaPct,
  deltaLabel,
  badgeState,
  accentColor = 'zinc',
  progressPct,
  progressLeftLabel,
  progressRightLabel,
  metrics,
  footerNote,
}) => {
  const topBorderAccent = {
    emerald: 'border-t-[#10b981]',
    crimson: 'border-t-[#f43f5e]',
    amber: 'border-t-[#f59e0b]',
    yellow: 'border-t-[#eab308]',
    purple: 'border-t-[#7c3aed]',
    zinc: 'border-t-[#27272a]',
  }[accentColor];

  const barTone = {
    emerald: 'bg-[#10b981]',
    crimson: 'bg-[#f43f5e]',
    amber: 'bg-[#f59e0b]',
    yellow: 'bg-[#eab308]',
    purple: 'bg-[#7c3aed]',
    zinc: 'bg-zinc-400',
  }[accentColor];

  const subToneClass = (tone?: MetricCardSubItem['tone']) => {
    switch (tone) {
      case 'emerald':
        return 'text-[#10b981]';
      case 'crimson':
        return 'text-[#f43f5e]';
      case 'amber':
        return 'text-[#f59e0b]';
      case 'yellow':
        return 'text-[#eab308]';
      case 'purple':
        return 'text-[#7c3aed]';
      default:
        return 'text-zinc-200';
    }
  };

  const isPositive = typeof deltaPct === 'number' && deltaPct >= 0;
  const isSteepDrop = typeof deltaPct === 'number' && deltaPct <= -5.0;

  return (
    <div
      id={id}
      className={`flex flex-col justify-between rounded-md border border-[#27272a] border-t-2 ${topBorderAccent} bg-[#18181b] p-4`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 border-b border-[#27272a] pb-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 whitespace-nowrap rounded-sm bg-[#09090b] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-300 border border-[#27272a]">
              {code}
            </span>
            <span className="truncate text-xs font-medium uppercase tracking-wider text-zinc-400">
              {title}
            </span>
          </div>
          <div className="shrink-0">
            {badgeState && <DecisionBadge state={badgeState} size="sm" />}
          </div>
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="tabular-nums-mono text-2xl font-bold tracking-tight text-zinc-100">
              {primaryValue}
            </span>
            {unitLabel && (
              <span className="font-mono text-xs font-medium uppercase text-zinc-400">
                {unitLabel}
              </span>
            )}
          </div>

          {typeof deltaPct === 'number' ? (
            <div
              className={`tabular-nums-mono rounded-sm border px-1.5 py-0.5 text-xs font-semibold ${
                isSteepDrop
                  ? 'border-[#f43f5e]/50 bg-[#f43f5e]/15 text-[#f43f5e]'
                  : isPositive
                    ? 'border-[#10b981]/30 bg-[#10b981]/10 text-[#10b981]'
                    : 'border-[#f43f5e]/30 bg-[#f43f5e]/10 text-[#f43f5e]'
              }`}
            >
              {deltaPct >= 0 ? `+${deltaPct.toFixed(2)}%` : `${deltaPct.toFixed(2)}%`}{' '}
              <span className="text-[10px] font-normal opacity-80">24H</span>
            </div>
          ) : deltaLabel ? (
            <span className="rounded-sm border border-[#27272a] bg-[#09090b] px-1.5 py-0.5 font-mono text-[11px] font-medium text-zinc-300">
              {deltaLabel}
            </span>
          ) : null}
        </div>

        {typeof progressPct === 'number' && (
          <div className="mt-3">
            <div className="flex justify-between font-mono text-[10px] text-zinc-400">
              <span>{progressLeftLabel}</span>
              <span>{progressRightLabel}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-sm bg-[#09090b] border border-[#27272a]">
              <div
                className={`h-full ${barTone}`}
                style={{
                  width: `${Math.max(4, Math.min(100, progressPct))}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#27272a] pt-2.5">
          {metrics.map((m, idx) => (
            <div
              key={idx}
              className="rounded-sm bg-[#09090b]/70 px-2 py-1.5 border border-[#27272a]/70"
            >
              <div className="truncate text-[10px] uppercase tracking-wider text-zinc-400">
                {m.label}
              </div>
              <div
                className={`tabular-nums-mono mt-0.5 truncate whitespace-nowrap text-xs font-semibold ${subToneClass(
                  m.tone
                )}`}
              >
                {m.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-[#27272a] pt-2 font-mono text-[11px] text-zinc-400">
        <span className="truncate">{footerNote}</span>
      </div>
    </div>
  );
};
