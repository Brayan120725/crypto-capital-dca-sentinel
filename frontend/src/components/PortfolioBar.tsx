import React from 'react';
import { PortfolioSummary, DecisionState } from '../types';

interface PortfolioBarProps {
  portfolio: PortfolioSummary;
  globalBadge: DecisionState;
}

export const PortfolioBar: React.FC<PortfolioBarProps> = ({
  portfolio,
  globalBadge,
}) => {
  const colorByAsset: Record<
    string,
    { bar: string; dot: string; text: string; border: string }
  > = {
    BTC: {
      bar: 'bg-[#eab308]',
      dot: 'bg-[#eab308]',
      text: 'text-[#eab308]',
      border: 'border-[#eab308]/40',
    },
    ETH: {
      bar: 'bg-[#7c3aed]',
      dot: 'bg-[#7c3aed]',
      text: 'text-[#7c3aed]',
      border: 'border-[#7c3aed]/40',
    },
    USDT: {
      bar: 'bg-[#10b981]',
      dot: 'bg-[#10b981]',
      text: 'text-[#10b981]',
      border: 'border-[#10b981]/40',
    },
  };

  return (
    <section
      id="portfolio-distribution-panel"
      className="rounded-md border border-[#27272a] bg-[#18181b] p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#27272a] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-sm bg-[#eab308]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
              PORTFOLIO CAPITAL ALLOCATION (50% BTC / 30% ETH / 20% USDT EARN)
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Aporte programado: $150.000 COP quincenal (~45,25 USDT) · $300.000 COP mensual (~90,50 USDT)
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="rounded-sm border border-[#27272a] bg-[#09090b] px-2.5 py-1">
            <span className="text-zinc-400">NAV TOTAL: </span>
            <span className="tabular-nums-mono font-bold text-zinc-100">
              ${portfolio.total_valuation_usdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
            </span>
          </div>
          <div className="rounded-sm border border-[#27272a] bg-[#09090b] px-2.5 py-1">
            <span className="text-zinc-400">EARN APR: </span>
            <span className="tabular-nums-mono font-semibold text-[#10b981]">
              {portfolio.usdt_earn_apr_pct.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-md border border-[#27272a] bg-[#09090b] p-3">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-zinc-400">
            <span>OBJETIVO ESTRATÉGICO (MODELO 50 / 30 / 20)</span>
            <span className="font-mono text-zinc-300">100.0%</span>
          </div>
          <div className="mt-2 flex h-3 w-full overflow-hidden rounded-sm border border-[#27272a] bg-[#18181b]">
            {portfolio.allocations.map((slice) => (
              <div
                key={`target-${slice.asset}`}
                className={`${colorByAsset[slice.asset]?.bar || 'bg-zinc-500'} h-full border-r border-[#09090b] last:border-r-0`}
                style={{ width: `${slice.target_weight_pct}%` }}
                title={`${slice.asset}: ${slice.target_weight_pct}%`}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[11px]">
            {portfolio.allocations.map((slice) => (
              <span key={`legend-t-${slice.asset}`} className="inline-flex items-center gap-1.5 text-zinc-300">
                <span className={`h-2 w-2 rounded-sm ${colorByAsset[slice.asset]?.dot}`} />
                {slice.asset} {slice.target_weight_pct.toFixed(0)}%
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-[#27272a] bg-[#09090b] p-3">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-zinc-400">
            <span>PONDERACIÓN ACTUAL EN TIEMPO REAL</span>
            <span className="font-mono text-zinc-300">
              MODO: {globalBadge.toUpperCase()}
            </span>
          </div>
          <div className="mt-2 flex h-3 w-full overflow-hidden rounded-sm border border-[#27272a] bg-[#18181b]">
            {portfolio.allocations.map((slice) => (
              <div
                key={`curr-${slice.asset}`}
                className={`${colorByAsset[slice.asset]?.bar || 'bg-zinc-500'} h-full border-r border-[#09090b] last:border-r-0`}
                style={{ width: `${slice.current_weight_pct}%` }}
                title={`${slice.asset}: ${slice.current_weight_pct}%`}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[11px]">
            {portfolio.allocations.map((slice) => (
              <span
                key={`legend-c-${slice.asset}`}
                className="inline-flex items-center gap-1.5 whitespace-nowrap text-zinc-300"
              >
                <span className={`h-2 w-2 shrink-0 rounded-sm ${colorByAsset[slice.asset]?.dot}`} />
                <span>
                  {slice.asset} {slice.current_weight_pct.toFixed(1)}% (
                  <span
                    className={
                      Math.abs(slice.drift_pct) > 3
                        ? 'text-[#f59e0b]'
                        : 'text-zinc-400'
                    }
                  >
                    {slice.drift_pct >= 0
                      ? `+${slice.drift_pct.toFixed(1)}%`
                      : `${slice.drift_pct.toFixed(1)}%`}
                  </span>
                  )
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-md border border-[#27272a]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#27272a] bg-[#09090b] text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              <th className="px-3 py-2.5">Activo / Rol</th>
              <th className="px-3 py-2.5 text-right">Target / Actual</th>
              <th className="px-3 py-2.5 text-right">Balance &amp; Valor</th>
              <th className="px-3 py-2.5 text-right">DCA Quincenal ($150k COP)</th>
              <th className="px-3 py-2.5 text-right">DCA Mensual ($300k COP)</th>
              <th className="px-3 py-2.5">Directriz de Ejecución</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272a] bg-[#18181b] text-xs">
            {portfolio.allocations.map((slice) => {
              const palette = colorByAsset[slice.asset] || colorByAsset.BTC;
              return (
                <tr
                  key={slice.asset}
                  className="hover:bg-[#09090b]/60 transition-colors"
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-1 rounded-sm ${palette.bar}`} />
                      <div>
                        <div className="font-mono font-semibold text-zinc-100">
                          {slice.asset}{' '}
                          <span className="font-sans text-xs font-normal text-zinc-400">
                            · {slice.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400">{slice.role}</div>
                      </div>
                    </div>
                  </td>

                  <td className="tabular-nums-mono whitespace-nowrap px-3 py-2.5 text-right">
                    <div className="font-semibold text-zinc-100">
                      {slice.target_weight_pct.toFixed(0)}%{' '}
                      <span className="text-zinc-400">/</span>{' '}
                      <span>{slice.current_weight_pct.toFixed(1)}%</span>
                    </div>
                    <div
                      className={`text-[11px] ${
                        Math.abs(slice.drift_pct) > 3
                          ? 'text-[#f59e0b]'
                          : 'text-zinc-400'
                      }`}
                    >
                      Drift: {slice.drift_pct >= 0 ? `+${slice.drift_pct.toFixed(2)}%` : `${slice.drift_pct.toFixed(2)}%`}
                    </div>
                  </td>

                  <td className="tabular-nums-mono whitespace-nowrap px-3 py-2.5 text-right">
                    <div className="font-semibold text-zinc-100">
                      ${slice.valuation_usdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {slice.asset === 'USDT'
                        ? `${slice.holdings_amount.toFixed(2)} USDT`
                        : `${slice.holdings_amount.toFixed(5)} ${slice.asset}`}
                    </div>
                  </td>

                  <td className="tabular-nums-mono whitespace-nowrap px-3 py-2.5 text-right">
                    <div className="font-semibold text-zinc-100">
                      {slice.biweekly_allocation_usdt.toFixed(2)} USDT
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      ${slice.biweekly_allocation_cop.toLocaleString('es-CO')} COP
                    </div>
                  </td>

                  <td className="tabular-nums-mono whitespace-nowrap px-3 py-2.5 text-right">
                    <div className="font-semibold text-zinc-100">
                      {slice.monthly_allocation_usdt.toFixed(2)} USDT
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      ${slice.monthly_allocation_cop.toLocaleString('es-CO')} COP
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span
                      className={`inline-block rounded-sm border px-2 py-0.5 font-mono text-[10px] font-semibold ${
                        globalBadge === 'Comprar Dip'
                          ? 'border-[#10b981]/40 bg-[#10b981]/10 text-[#10b981]'
                          : globalBadge === 'Acumular USDT'
                            ? 'border-[#f43f5e]/40 bg-[#f43f5e]/10 text-[#f43f5e]'
                            : 'border-[#27272a] bg-[#09090b] text-zinc-300'
                      }`}
                    >
                      {slice.effective_action}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
