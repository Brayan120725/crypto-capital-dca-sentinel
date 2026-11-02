import React from 'react';
import { AssetMarketMetrics, FearGreedSnapshot } from '../types';

interface RsiOscillatorProps {
  btc: AssetMarketMetrics;
  eth: AssetMarketMetrics;
  fng: FearGreedSnapshot;
}

export const RsiOscillator: React.FC<RsiOscillatorProps> = ({ btc, eth, fng }) => {
  const classifyRsi = (rsi: number) => {
    if (rsi <= 35) {
      return {
        zone: 'OVERSOLD // BUY DIP ZONE (<=35)',
        tone: 'text-[#10b981]',
        border: 'border-[#10b981]/40',
        bg: 'bg-[#10b981]/10',
        bar: 'bg-[#10b981]',
      };
    }
    if (rsi >= 75) {
      return {
        zone: 'OVERBOUGHT // OVERHEAT RISK (>=75)',
        tone: 'text-[#f43f5e]',
        border: 'border-[#f43f5e]/40',
        bg: 'bg-[#f43f5e]/10',
        bar: 'bg-[#f43f5e]',
      };
    }
    if (rsi <= 42) {
      return {
        zone: 'ACCUMULATION BIAS (35-42)',
        tone: 'text-[#f59e0b]',
        border: 'border-[#f59e0b]/40',
        bg: 'bg-[#f59e0b]/10',
        bar: 'bg-[#f59e0b]',
      };
    }
    return {
      zone: 'EQUILIBRIUM RANGE (35-75)',
      tone: 'text-zinc-300',
      border: 'border-[#27272a]',
      bg: 'bg-[#09090b]',
      bar: 'bg-[#eab308]',
    };
  };

  const btcMeta = classifyRsi(btc.rsi_14_daily);
  const ethMeta = classifyRsi(eth.rsi_14_daily);

  const width = 560;
  const height = 135;
  const padX = 24;
  const padY = 14;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const yForRsi = (val: number) => {
    const clamped = Math.max(10, Math.min(95, val));
    return padY + plotH - ((clamped - 10) / 85) * plotH;
  };

  const btcPoints = btc.rsi_series
    .map((pt, idx, arr) => {
      const x = padX + (idx / Math.max(1, arr.length - 1)) * plotW;
      const rVal =
        idx === arr.length - 1 ? btc.rsi_14_daily : (pt.rsi ?? btc.rsi_14_daily);
      return `${x.toFixed(1)},${yForRsi(rVal).toFixed(1)}`;
    })
    .join(' ');

  const ethPoints = eth.rsi_series
    .map((pt, idx, arr) => {
      const x = padX + (idx / Math.max(1, arr.length - 1)) * plotW;
      const rVal =
        idx === arr.length - 1 ? eth.rsi_14_daily : (pt.rsi ?? eth.rsi_14_daily);
      return `${x.toFixed(1)},${yForRsi(rVal).toFixed(1)}`;
    })
    .join(' ');

  const y75 = yForRsi(75);
  const y50 = yForRsi(50);
  const y35 = yForRsi(35);

  return (
    <section
      id="rsi-oscillator-panel"
      className="rounded-md border border-[#27272a] bg-[#18181b] p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#27272a] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-sm bg-[#7c3aed]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
              WILDER RSI-14 DAILY OSCILLATOR &amp; QUANTITATIVE TRIGGER MATRIX
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Monitoreo de sobreventa (&le;35) y sobrecalentamiento (&ge;75) en velas diarias 1D
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="inline-flex items-center gap-1.5 text-zinc-300">
            <span className="h-2 w-2 rounded-sm bg-[#eab308]" /> BTC RSI-14
          </span>
          <span className="inline-flex items-center gap-1.5 text-zinc-300">
            <span className="h-2 w-2 rounded-sm bg-[#7c3aed]" /> ETH RSI-14
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        {[
          { item: btc, meta: btcMeta, dotColor: 'bg-[#eab308]' },
          { item: eth, meta: ethMeta, dotColor: 'bg-[#7c3aed]' },
        ].map(({ item, meta, dotColor }) => {
          const deltaRsi = item.rsi_14_daily - item.rsi_prev_daily;
          return (
            <div
              key={item.symbol}
              className="rounded-md border border-[#27272a] bg-[#09090b] p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-sm ${dotColor}`} />
                  <span className="font-mono text-xs font-semibold text-zinc-200">
                    {item.symbol} // 1D RSI
                  </span>
                </div>
                <span
                  className={`rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${meta.bg} ${meta.border} ${meta.tone}`}
                >
                  {meta.zone}
                </span>
              </div>

              <div className="mt-2 flex items-baseline justify-between">
                <div className="tabular-nums-mono text-2xl font-bold text-zinc-100">
                  {item.rsi_14_daily.toFixed(2)}
                </div>
                <div className="tabular-nums-mono text-xs text-zinc-400">
                  Prev 1D: <span className="text-zinc-200">{item.rsi_prev_daily.toFixed(2)}</span>{' '}
                  ({deltaRsi >= 0 ? `+${deltaRsi.toFixed(2)}` : deltaRsi.toFixed(2)})
                </div>
              </div>

              <div className="relative mt-2.5 h-2.5 w-full rounded-sm bg-[#18181b] border border-[#27272a]">
                <div
                  className="absolute inset-y-0 left-0 bg-[#10b981]/20 border-r border-[#10b981]/50"
                  style={{ width: '35%' }}
                />
                <div
                  className="absolute inset-y-0 right-0 bg-[#f43f5e]/20 border-l border-[#f43f5e]/50"
                  style={{ width: '25%' }}
                />
                <div
                  className={`absolute -top-1 bottom-[-4px] w-1.5 rounded-sm ${meta.bar} ring-1 ring-[#09090b]`}
                  style={{
                    left: `calc(${Math.max(2, Math.min(98, item.rsi_14_daily))}% - 3px)`,
                  }}
                />
              </div>

              <div className="mt-1.5 flex justify-between font-mono text-[10px] text-zinc-400">
                <span className="text-[#10b981]">0 — BUY DIP (&le;35)</span>
                <span>NEUTRAL (50)</span>
                <span className="text-[#f43f5e]">OVERHEAT (&ge;75) — 100</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 rounded-md border border-[#27272a] bg-[#09090b] p-3">
        <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] text-zinc-400">
          <span>14-DAY DAILY RSI CONVERGENCE TRAJECTORY</span>
          <span>BANDS: 35 (OVERSOLD) / 50 (MID) / 75 (OVERBOUGHT)</span>
        </div>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-36 w-full overflow-visible"
          role="img"
          aria-label="Oscilador RSI 14 días BTC y ETH"
        >
          <rect
            x={padX}
            y={padY}
            width={plotW}
            height={Math.max(0, y75 - padY)}
            fill="#f43f5e"
            fillOpacity="0.07"
          />
          <rect
            x={padX}
            y={y35}
            width={plotW}
            height={Math.max(0, padY + plotH - y35)}
            fill="#10b981"
            fillOpacity="0.07"
          />
          <line
            x1={padX}
            y1={y75}
            x2={width - padX}
            y2={y75}
            stroke="#f43f5e"
            strokeDasharray="3 3"
            strokeWidth="1"
            strokeOpacity="0.7"
          />
          <line
            x1={padX}
            y1={y50}
            x2={width - padX}
            y2={y50}
            stroke="#3f3f46"
            strokeDasharray="2 4"
            strokeWidth="1"
          />
          <line
            x1={padX}
            y1={y35}
            x2={width - padX}
            y2={y35}
            stroke="#10b981"
            strokeDasharray="3 3"
            strokeWidth="1"
            strokeOpacity="0.7"
          />
          <text
            x={width - padX + 4}
            y={y75 + 3}
            className="fill-[#f43f5e] font-mono text-[9px]"
          >
            75
          </text>
          <text
            x={width - padX + 4}
            y={y50 + 3}
            className="fill-zinc-400 font-mono text-[9px]"
          >
            50
          </text>
          <text
            x={width - padX + 4}
            y={y35 + 3}
            className="fill-[#10b981] font-mono text-[9px]"
          >
            35
          </text>
          {ethPoints && (
            <polyline
              fill="none"
              stroke="#7c3aed"
              strokeWidth="2"
              points={ethPoints}
            />
          )}
          {btcPoints && (
            <polyline
              fill="none"
              stroke="#eab308"
              strokeWidth="2"
              points={btcPoints}
            />
          )}
        </svg>
        <div className="mt-1 flex justify-between font-mono text-[10px] text-zinc-400">
          {btc.rsi_series
            .filter((_, i, a) => i === 0 || i === Math.floor(a.length / 2) || i === a.length - 1)
            .map((pt) => (
              <span key={pt.timestamp}>{pt.date_label}</span>
            ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 border-t border-[#27272a] pt-3 sm:grid-cols-3">
        <div className="rounded-sm border border-[#27272a] bg-[#09090b] p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#10b981]">
              REGLA 01 // COMPRA FUERTE
            </span>
            <span className="font-mono text-[10px] text-zinc-400">
              {btc.price_change_pct_24h <= -5.0 || eth.price_change_pct_24h <= -5.0
                ? 'CAÍDA ACTIVA'
                : 'EN ESPERA'}
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px] text-zinc-300">
            Caída 24h &ge; 5% <span className="text-zinc-400">AND</span> (RSI &le; 35{' '}
            <span className="text-zinc-400">OR</span> F&amp;G &le; 30)
          </p>
        </div>

        <div className="rounded-sm border border-[#27272a] bg-[#09090b] p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#f43f5e]">
              REGLA 02 // SOBRECALENTAMIENTO
            </span>
            <span className="font-mono text-[10px] text-zinc-400">
              {fng.value >= 80 || btc.rsi_14_daily >= 75 || eth.rsi_14_daily >= 75
                ? 'ALERTA ACTIVA'
                : 'EN ESPERA'}
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px] text-zinc-300">
            Fear &amp; Greed &ge; 80 <span className="text-zinc-400">OR</span> RSI 1D &ge; 75
            (Subida Acel.)
          </p>
        </div>

        <div className="rounded-sm border border-[#27272a] bg-[#09090b] p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#f59e0b]">
              REGLA 03 // FILTRO ANTI-SPAM
            </span>
            <span className="font-mono text-[10px] text-[#10b981]">COOLDOWN 12H</span>
          </div>
          <p className="mt-1 font-mono text-[11px] text-zinc-300">
            Silencio en rango neutral · Bloqueo 12h por activo
          </p>
        </div>
      </div>
    </section>
  );
};
