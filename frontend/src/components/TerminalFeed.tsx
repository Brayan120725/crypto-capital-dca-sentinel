import React, { useState } from 'react';
import { TerminalFeedItem } from '../types';
import { DecisionBadge } from './DecisionBadge';

interface TerminalFeedProps {
  items: TerminalFeedItem[];
  antiSpamStatus: string;
  cooldownHours: number;
}

export const TerminalFeed: React.FC<TerminalFeedProps> = ({
  items,
  antiSpamStatus,
  cooldownHours,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'TRIGGERS'>('ALL');

  const visibleItems =
    filter === 'ALL'
      ? items
      : items.filter((item) => item.signal_type !== 'NEUTRAL');

  return (
    <section
      id="terminal-feed-panel"
      className="flex flex-col justify-between rounded-md border border-[#27272a] bg-[#18181b] p-4"
    >
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#27272a] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-sm bg-[#10b981]" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                SENTINEL TELEMETRY &amp; TELEGRAM DISPATCH LOG
              </h2>
            </div>
            <p className="mt-0.5 font-mono text-[11px] text-zinc-400">
              GATE: {antiSpamStatus} · COOLDOWN: {cooldownHours}H / ACTIVO
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-sm border border-[#27272a] bg-[#09090b] p-0.5 font-mono text-[10px]">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`rounded-sm px-2 py-1 uppercase transition-colors ${
                filter === 'ALL'
                  ? 'bg-[#27272a] font-semibold text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              ALL ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('TRIGGERS')}
              className={`rounded-sm px-2 py-1 uppercase transition-colors ${
                filter === 'TRIGGERS'
                  ? 'bg-[#27272a] font-semibold text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              ALERTS ONLY
            </button>
          </div>
        </div>

        <div className="mt-3 space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
          {visibleItems.map((entry) => {
            const leftAccent =
              entry.signal_type === 'BUY_DIP'
                ? 'border-l-[#10b981]'
                : entry.signal_type === 'OVERHEAT_RISK'
                  ? 'border-l-[#f43f5e]'
                  : 'border-l-[#eab308]';

            return (
              <div
                key={entry.id}
                className={`rounded-sm border border-[#27272a] border-l-2 ${leftAccent} bg-[#09090b] p-3`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-sm border border-[#27272a] bg-[#18181b] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-300">
                      {entry.asset}
                    </span>
                    <span className="tabular-nums-mono text-[11px] text-zinc-400">
                      {entry.timestamp_utc}
                    </span>
                    {entry.is_live && (
                      <span className="rounded-sm bg-[#eab308]/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-[#eab308] border border-[#eab308]/40">
                        LIVE CYCLE
                      </span>
                    )}
                  </div>
                  <DecisionBadge state={entry.badge_label} size="sm" />
                </div>

                <div className="mt-2 font-mono text-xs font-semibold text-zinc-100">
                  {entry.headline}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  {entry.detail}
                </p>

                <div className="mt-2 flex items-center justify-between border-t border-[#27272a]/80 pt-1.5 font-mono text-[10px] text-zinc-400">
                  <span>ID: {entry.id}</span>
                  <span
                    className={
                      entry.telegram_status.includes('DELIVERED') ||
                      entry.telegram_status.includes('SENT') ||
                      entry.telegram_status.includes('DISPATCHED')
                        ? 'text-[#10b981]'
                        : 'text-zinc-400'
                    }
                  >
                    TELEGRAM: {entry.telegram_status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-[#27272a] pt-2.5 font-mono text-[11px] text-zinc-400">
        <span>CRON SCHEDULE: EVERY 4H (GITHUB ACTIONS)</span>
        <span className="text-zinc-300">BOT STATUS: ARMED</span>
      </div>
    </section>
  );
};
