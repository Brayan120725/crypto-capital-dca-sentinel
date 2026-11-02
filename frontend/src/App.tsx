import React, { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw,
  Terminal,
  ShieldCheck,
  Sliders,
  Send,
  Clock,
  Database,
} from 'lucide-react';
import { SentinelEvaluationReport, SimulationMode } from './types';
import { MetricCard } from './components/MetricCard';
import { DecisionBadge } from './components/DecisionBadge';
import { RsiOscillator } from './components/RsiOscillator';
import { PortfolioBar } from './components/PortfolioBar';
import { TerminalFeed } from './components/TerminalFeed';

const FALLBACK_REPORT: SentinelEvaluationReport = {
  evaluated_at_utc: '2026-11-02T16:15:00Z',
  global_badge: 'Neutral',
  global_signal: 'NEUTRAL',
  global_summary:
    'Mercado sin extremos cuantitativos (BTC -0.75%, RSI 35.8 | ETH +0.05%, RSI 34.0 | F&G 37).',
  global_suggested_action:
    'Filtro Anti-Spam activo: No enviar alertas a Telegram. Mantener DCA programado 50% BTC / 30% ETH / 20% USDT (Earn Flexible).',
  anti_spam_status: 'SILENT — NO SPAM (COOLDOWN 12H ARMED)',
  cooldown_hours: 12,
  snapshot: {
    timestamp_utc: '2026-11-02T16:15:00Z',
    source_endpoint: 'https://data-api.binance.vision/api/v3',
    btc: {
      symbol: 'BTCUSDT',
      asset: 'BTC',
      last_price: 77429.34,
      price_change_24h: -576.4,
      price_change_pct_24h: -0.74,
      weighted_avg_price: 78085.87,
      high_24h: 78878.01,
      low_24h: 77283.08,
      volume_base_24h: 10623.74,
      volume_quote_24h: 829564286.94,
      rsi_14_daily: 35.84,
      rsi_prev_daily: 39.12,
      rsi_series: [
        { timestamp: 1792454400000, date_label: '20 Oct', close: 83028.15, rsi: 54.2 },
        { timestamp: 1792540800000, date_label: '21 Oct', close: 84093.42, rsi: 57.8 },
        { timestamp: 1792627200000, date_label: '22 Oct', close: 81416.09, rsi: 48.1 },
        { timestamp: 1792713600000, date_label: '23 Oct', close: 81189.43, rsi: 47.3 },
        { timestamp: 1792800000000, date_label: '24 Oct', close: 80888.16, rsi: 46.2 },
        { timestamp: 1792886400000, date_label: '25 Oct', close: 80154.09, rsi: 43.8 },
        { timestamp: 1792972800000, date_label: '26 Oct', close: 80150.56, rsi: 43.7 },
        { timestamp: 1793059200000, date_label: '27 Oct', close: 80909.77, rsi: 46.9 },
        { timestamp: 1793145600000, date_label: '28 Oct', close: 81343.5, rsi: 48.6 },
        { timestamp: 1793232000000, date_label: '29 Oct', close: 77991.89, rsi: 38.4 },
        { timestamp: 1793318400000, date_label: '30 Oct', close: 77368.77, rsi: 36.8 },
        { timestamp: 1793404800000, date_label: '31 Oct', close: 77582.02, rsi: 37.7 },
        { timestamp: 1793491200000, date_label: '01 Nov', close: 78354.0, rsi: 39.12 },
        { timestamp: 1793577600000, date_label: '02 Nov', close: 77429.34, rsi: 35.84 },
      ],
      updated_at: '2026-11-02T16:15:00Z',
    },
    eth: {
      symbol: 'ETHUSDT',
      asset: 'ETH',
      last_price: 2269.46,
      price_change_24h: 1.7,
      price_change_pct_24h: 0.08,
      weighted_avg_price: 2286.86,
      high_24h: 2317.84,
      low_24h: 2247.84,
      volume_base_24h: 234574.48,
      volume_quote_24h: 536438396.68,
      rsi_14_daily: 33.96,
      rsi_prev_daily: 33.85,
      rsi_series: [
        { timestamp: 1792454400000, date_label: '20 Oct', close: 2510.2, rsi: 49.4 },
        { timestamp: 1792540800000, date_label: '21 Oct', close: 2542.8, rsi: 51.9 },
        { timestamp: 1792627200000, date_label: '22 Oct', close: 2465.1, rsi: 45.2 },
        { timestamp: 1792713600000, date_label: '23 Oct', close: 2440.5, rsi: 43.6 },
        { timestamp: 1792800000000, date_label: '24 Oct', close: 2418.0, rsi: 42.1 },
        { timestamp: 1792886400000, date_label: '25 Oct', close: 2390.4, rsi: 40.3 },
        { timestamp: 1792972800000, date_label: '26 Oct', close: 2384.2, rsi: 39.8 },
        { timestamp: 1793059200000, date_label: '27 Oct', close: 2405.6, rsi: 41.7 },
        { timestamp: 1793145600000, date_label: '28 Oct', close: 2419.3, rsi: 42.9 },
        { timestamp: 1793232000000, date_label: '29 Oct', close: 2315.8, rsi: 36.4 },
        { timestamp: 1793318400000, date_label: '30 Oct', close: 2281.4, rsi: 34.7 },
        { timestamp: 1793404800000, date_label: '31 Oct', close: 2274.9, rsi: 34.2 },
        { timestamp: 1793491200000, date_label: '01 Nov', close: 2267.76, rsi: 33.85 },
        { timestamp: 1793577600000, date_label: '02 Nov', close: 2269.46, rsi: 33.96 },
      ],
      updated_at: '2026-11-02T16:15:00Z',
    },
    fear_and_greed: {
      value: 37,
      value_classification: 'Fear',
      timestamp: 1793577600,
      time_until_update: 28108,
    },
  },
  decisions: {
    BTC: {
      asset: 'BTC',
      symbol: 'BTCUSDT',
      signal_type: 'NEUTRAL',
      badge_label: 'Neutral',
      triggered: false,
      cooldown_active: false,
      cooldown_remaining_minutes: 0,
      should_notify_telegram: false,
      reason:
        'Mercado en rango técnico (-0.74% 24h | RSI 35.8 | F&G 37). Sin disparadores extremos.',
      suggested_action:
        'Mantener ejecución DCA estándar programada (50% BTC / 30% ETH / 20% USDT Earn) sin alertas a Telegram.',
      timestamp_utc: '2026-11-02T16:15:00Z',
    },
    ETH: {
      asset: 'ETH',
      symbol: 'ETHUSDT',
      signal_type: 'NEUTRAL',
      badge_label: 'Neutral',
      triggered: false,
      cooldown_active: false,
      cooldown_remaining_minutes: 0,
      should_notify_telegram: false,
      reason:
        'Mercado en rango técnico (+0.08% 24h | RSI 34.0 | F&G 37). Sin caída >= 5% en 24h.',
      suggested_action:
        'Mantener ejecución DCA estándar programada (50% BTC / 30% ETH / 20% USDT Earn) sin alertas a Telegram.',
      timestamp_utc: '2026-11-02T16:15:00Z',
    },
  },
  portfolio: {
    total_valuation_usdt: 6493.83,
    total_valuation_cop: 21526450,
    implied_cop_usdt_rate: 3314.92,
    dca_biweekly_cop: 150000,
    dca_biweekly_usdt: 45.25,
    dca_monthly_cop: 300000,
    dca_monthly_usdt: 90.5,
    usdt_earn_apr_pct: 6.8,
    usdt_earn_annual_yield_usdt: 84.32,
    usdt_dry_powder_available: 1240.0,
    allocations: [
      {
        asset: 'BTC',
        label: 'Bitcoin Spot',
        role: 'Core Store of Value',
        target_weight_pct: 50.0,
        current_weight_pct: 50.68,
        drift_pct: 0.68,
        holdings_amount: 0.0425,
        unit_price_usdt: 77429.34,
        valuation_usdt: 3290.75,
        biweekly_allocation_usdt: 22.62,
        biweekly_allocation_cop: 75000,
        monthly_allocation_usdt: 45.25,
        monthly_allocation_cop: 150000,
        effective_action: 'ACUMULACIÓN DCA PROGRAMADA (50%)',
      },
      {
        asset: 'ETH',
        label: 'Ethereum Spot',
        role: 'Smart Contract Settlement Layer',
        target_weight_pct: 30.0,
        current_weight_pct: 30.23,
        drift_pct: 0.23,
        holdings_amount: 0.865,
        unit_price_usdt: 2269.46,
        valuation_usdt: 1963.08,
        biweekly_allocation_usdt: 13.57,
        biweekly_allocation_cop: 45000,
        monthly_allocation_usdt: 27.15,
        monthly_allocation_cop: 90000,
        effective_action: 'ACUMULACIÓN DCA PROGRAMADA (30%)',
      },
      {
        asset: 'USDT',
        label: 'USDT (Earn Flexible)',
        role: 'Dry Powder & Yield Reserve',
        target_weight_pct: 20.0,
        current_weight_pct: 19.09,
        drift_pct: -0.91,
        holdings_amount: 1240.0,
        unit_price_usdt: 1.0,
        valuation_usdt: 1240.0,
        biweekly_allocation_usdt: 9.05,
        biweekly_allocation_cop: 30000,
        monthly_allocation_usdt: 18.1,
        monthly_allocation_cop: 60000,
        effective_action: 'RESERVA DE LIQUIDEZ EARN FLEXIBLE (20%)',
      },
    ],
  },
  terminal_feed: [
    {
      id: 'EVT-LIVE-SYS',
      timestamp_utc: '2026-11-02 16:15:00 UTC',
      asset: 'SYS',
      signal_type: 'NEUTRAL',
      badge_label: 'Neutral',
      headline: 'ANTI-SPAM FILTER ENGAGED — RANGO NEUTRAL',
      detail:
        'BTC $77,429.34 (-0.74% | RSI 35.8) · ETH $2,269.46 (+0.08% | RSI 34.0) · F&G 37 (Fear).',
      telegram_status: 'SUPPRESSED (ANTI-SPAM / NEUTRAL)',
      is_live: true,
    },
    {
      id: 'EVT-HIST-003',
      timestamp_utc: '2026-10-30 10:15:00 UTC',
      asset: 'ETH',
      signal_type: 'BUY_DIP',
      badge_label: 'Comprar Dip',
      headline: 'ALERTA DE COMPRA FUERTE — ETH/USDT (-5.84% 24H | F&G 28)',
      detail:
        'Caída 24h >= 5% confirmada con Fear & Greed <= 30 (28/100). Canjear liquidez de Earn Flexible y ejecutar orden límite en rebaja.',
      telegram_status: 'DELIVERED (COOLDOWN 12H LOCKED)',
      is_live: false,
    },
    {
      id: 'EVT-HIST-002',
      timestamp_utc: '2026-10-24 02:15:00 UTC',
      asset: 'BTC',
      signal_type: 'BUY_DIP',
      badge_label: 'Comprar Dip',
      headline: 'ALERTA DE COMPRA FUERTE — BTC/USDT (-6.12% 24H | RSI 33.4)',
      detail:
        'Caída 24h >= 5% confirmada con RSI-14 diario <= 35 (33.4). Despliegue táctico de reserva USDT Earn Flexible hacia BTC Spot.',
      telegram_status: 'DELIVERED (COOLDOWN 12H LOCKED)',
      is_live: false,
    },
    {
      id: 'EVT-HIST-001',
      timestamp_utc: '2026-10-15 12:15:00 UTC',
      asset: 'BTC',
      signal_type: 'OVERHEAT_RISK',
      badge_label: 'Acumular USDT',
      headline: 'ALERTA DE RIESGO / SOBRECALENTAMIENTO — BTC/USDT (RSI 76.8 | F&G 82)',
      detail:
        'Fear & Greed >= 80 y RSI diario >= 75 con subida acelerada. Compras spot pausadas; aporte quincenal ($150.000 COP / 45.25 USDT) redirigido a USDT Earn Flexible.',
      telegram_status: 'DELIVERED (COOLDOWN 12H LOCKED)',
      is_live: false,
    },
  ],
};

export const App: React.FC = () => {
  const [report, setReport] = useState<SentinelEvaluationReport>(FALLBACK_REPORT);
  const [mode, setMode] = useState<SimulationMode>('live');
  const [loading, setLoading] = useState<boolean>(false);
  const [apiConnected, setApiConnected] = useState<boolean>(true);

  const loadTelemetry = useCallback(async (selectedMode: SimulationMode) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/sentinel?mode=${selectedMode}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data: SentinelEvaluationReport = await response.json();
      setReport(data);
      setApiConnected(true);
    } catch {
      setApiConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTelemetry(mode);
  }, [mode, loadTelemetry]);

  const { snapshot, decisions, portfolio } = report;
  const btc = snapshot.btc;
  const eth = snapshot.eth;
  const fng = snapshot.fear_and_greed;

  const calcRangeProgress = (last: number, low: number, high: number) => {
    if (high <= low) return 50;
    return ((last - low) / (high - low)) * 100;
  };

  const btcRangePct = calcRangeProgress(btc.last_price, btc.low_24h, btc.high_24h);
  const ethRangePct = calcRangeProgress(eth.last_price, eth.low_24h, eth.high_24h);

  const fngAccent =
    fng.value <= 30
      ? 'emerald'
      : fng.value <= 45
        ? 'amber'
        : fng.value >= 80
          ? 'crimson'
          : 'yellow';

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <header className="border-b border-[#27272a] bg-[#18181b]">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[#eab308]/40 bg-[#09090b] text-[#eab308]">
              <Terminal className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-sm font-bold tracking-tight text-zinc-100">
                  SENTINEL QUANT // DCA &amp; OPPORTUNITY TERMINAL
                </h1>
                <span className="rounded-sm border border-[#7c3aed]/50 bg-[#7c3aed]/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-[#7c3aed]">
                  V1.0 INSTITUTIONAL
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-3 font-mono text-[11px] text-zinc-400">
                <span className="inline-flex items-center gap-1">
                  <span
                    className={`h-1.5 w-1.5 rounded-sm ${
                      apiConnected ? 'bg-[#10b981]' : 'bg-[#f59e0b]'
                    }`}
                  />
                  FEED: {apiConnected ? 'FASTAPI + BINANCE LIVE' : 'LOCAL SNAPSHOT'}
                </span>
                <span>·</span>
                <span>PORTFOLIO: 50% BTC / 30% ETH / 20% USDT EARN</span>
                <span>·</span>
                <span>COOLDOWN: {report.cooldown_hours}H ANTI-SPAM</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div
              className="flex items-center rounded-md border border-[#27272a] bg-[#09090b] p-0.5 font-mono text-[11px]"
              role="group"
              aria-label="Modo de simulación del motor de reglas"
            >
              <span className="flex items-center gap-1 px-2 text-[10px] uppercase text-zinc-400">
                <Sliders className="h-3 w-3 text-[#eab308]" /> MODE:
              </span>
              {(
                [
                  { id: 'live', label: 'LIVE MARKET' },
                  { id: 'dip', label: 'TEST: COMPRAR DIP' },
                  { id: 'overheat', label: 'TEST: ACUMULAR USDT' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  id={`mode-btn-${item.id}`}
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={`rounded-sm px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    mode === item.id
                      ? 'bg-[#27272a] font-semibold text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => loadTelemetry(mode)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#27272a] bg-[#09090b] px-2.5 py-1.5 font-mono text-xs text-zinc-200 hover:border-zinc-600 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#eab308]' : ''}`} />
              <span>SYNC</span>
            </button>

            <DecisionBadge
              state={report.global_badge}
              size="lg"
              sublabel={report.global_signal}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-4 px-4 py-4">
        <section
          id="sentinel-directive-banner"
          className={`rounded-md border p-3.5 ${
            report.global_badge === 'Comprar Dip'
              ? 'border-[#10b981]/50 bg-[#18181b]'
              : report.global_badge === 'Acumular USDT'
                ? 'border-[#f43f5e]/50 bg-[#18181b]'
                : 'border-[#27272a] bg-[#18181b]'
          }`}
        >
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-sm bg-[#09090b] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#eab308] border border-[#27272a]">
                  DECISION ENGINE VERDICT
                </span>
                <span className="font-mono text-xs font-semibold text-zinc-200">
                  {report.global_summary}
                </span>
              </div>
              <p className="text-xs text-zinc-300">
                <span className="font-mono uppercase text-zinc-400">DIRECTRIZ OPERATIVA: </span>
                <span className="font-medium text-zinc-100">
                  {report.global_suggested_action}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
              <div className="flex items-center gap-1.5 rounded-sm border border-[#27272a] bg-[#09090b] px-2.5 py-1 text-zinc-300">
                <ShieldCheck className="h-3.5 w-3.5 text-[#10b981]" />
                <span>{report.anti_spam_status}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-sm border border-[#27272a] bg-[#09090b] px-2.5 py-1 text-zinc-400">
                <Clock className="h-3.5 w-3.5 text-zinc-400" />
                <span>
                  UTC: {new Date(report.evaluated_at_utc).toISOString().replace('T', ' ').slice(0, 19)}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section
          id="metrics-grid"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          <MetricCard
            id="metric-card-btc"
            code="BTC/USDT"
            title="Bitcoin Spot · 50% Target"
            primaryValue={`$${btc.last_price.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            unitLabel="USDT"
            deltaPct={btc.price_change_pct_24h}
            badgeState={decisions.BTC.badge_label}
            accentColor={
              decisions.BTC.badge_label === 'Comprar Dip'
                ? 'emerald'
                : decisions.BTC.badge_label === 'Acumular USDT'
                  ? 'crimson'
                  : 'yellow'
            }
            progressPct={btcRangePct}
            progressLeftLabel={`24H LOW $${btc.low_24h.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
            progressRightLabel={`HIGH $${btc.high_24h.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
            metrics={[
              {
                label: 'RSI-14 DIARIO (1D)',
                value: `${btc.rsi_14_daily.toFixed(2)} ${
                  btc.rsi_14_daily <= 35
                    ? '[OVERSOLD]'
                    : btc.rsi_14_daily >= 75
                      ? '[OVERHEAT]'
                      : '[RANGE]'
                }`,
                tone:
                  btc.rsi_14_daily <= 35
                    ? 'emerald'
                    : btc.rsi_14_daily >= 75
                      ? 'crimson'
                      : 'default',
              },
              {
                label: 'DCA QUINCENAL (50%)',
                value: `${(portfolio.dca_biweekly_usdt * 0.5).toFixed(2)} USDT ($75k COP)`,
              },
              {
                label: 'CAMBIO 24H (ABS)',
                value: `${btc.price_change_24h >= 0 ? '+' : ''}$${btc.price_change_24h.toFixed(2)}`,
                tone: btc.price_change_24h >= 0 ? 'emerald' : 'crimson',
              },
              {
                label: 'VOLUMEN 24H (USDT)',
                value: `$${(btc.volume_quote_24h / 1_000_000).toFixed(1)}M`,
              },
            ]}
            footerNote={`VWAP 24H: $${btc.weighted_avg_price.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} · Umbral Dip: <= -5.0%`}
          />

          <MetricCard
            id="metric-card-eth"
            code="ETH/USDT"
            title="Ethereum Spot · 30% Target"
            primaryValue={`$${eth.last_price.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            unitLabel="USDT"
            deltaPct={eth.price_change_pct_24h}
            badgeState={decisions.ETH.badge_label}
            accentColor={
              decisions.ETH.badge_label === 'Comprar Dip'
                ? 'emerald'
                : decisions.ETH.badge_label === 'Acumular USDT'
                  ? 'crimson'
                  : 'purple'
            }
            progressPct={ethRangePct}
            progressLeftLabel={`24H LOW $${eth.low_24h.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
            progressRightLabel={`HIGH $${eth.high_24h.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
            metrics={[
              {
                label: 'RSI-14 DIARIO (1D)',
                value: `${eth.rsi_14_daily.toFixed(2)} ${
                  eth.rsi_14_daily <= 35
                    ? '[OVERSOLD]'
                    : eth.rsi_14_daily >= 75
                      ? '[OVERHEAT]'
                      : '[RANGE]'
                }`,
                tone:
                  eth.rsi_14_daily <= 35
                    ? 'emerald'
                    : eth.rsi_14_daily >= 75
                      ? 'crimson'
                      : 'default',
              },
              {
                label: 'DCA QUINCENAL (30%)',
                value: `${(portfolio.dca_biweekly_usdt * 0.3).toFixed(2)} USDT ($45k COP)`,
              },
              {
                label: 'CAMBIO 24H (ABS)',
                value: `${eth.price_change_24h >= 0 ? '+' : ''}$${eth.price_change_24h.toFixed(2)}`,
                tone: eth.price_change_24h >= 0 ? 'emerald' : 'crimson',
              },
              {
                label: 'VOLUMEN 24H (USDT)',
                value: `$${(eth.volume_quote_24h / 1_000_000).toFixed(1)}M`,
              },
            ]}
            footerNote={`VWAP 24H: $${eth.weighted_avg_price.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} · Umbral Dip: <= -5.0%`}
          />

          <MetricCard
            id="metric-card-fng"
            code="SENTIMENT"
            title="Alternative.me Fear & Greed"
            primaryValue={`${fng.value}`}
            unitLabel="/ 100"
            deltaLabel={fng.value_classification.toUpperCase()}
            accentColor={fngAccent}
            progressPct={fng.value}
            progressLeftLabel="0 EXTREME FEAR (<=30)"
            progressRightLabel="EXTREME GREED (>=80) 100"
            metrics={[
              {
                label: 'CLASIFICACIÓN',
                value: fng.value_classification.toUpperCase(),
                tone:
                  fng.value <= 30
                    ? 'emerald'
                    : fng.value <= 45
                      ? 'amber'
                      : fng.value >= 80
                        ? 'crimson'
                        : 'default',
              },
              {
                label: 'DISPARADOR COMPRA',
                value: fng.value <= 30 ? 'ACTIVO (<= 30)' : 'INACTIVO (> 30)',
                tone: fng.value <= 30 ? 'emerald' : 'default',
              },
              {
                label: 'DISPARADOR RIESGO',
                value: fng.value >= 80 ? 'ACTIVO (>= 80)' : 'INACTIVO (< 80)',
                tone: fng.value >= 80 ? 'crimson' : 'default',
              },
              {
                label: 'PRÓXIMO UPDATE',
                value: `${Math.max(1, Math.round(fng.time_until_update / 3600))}H RESTANTES`,
              },
            ]}
            footerNote="Fuente: api.alternative.me/fng/?limit=1 · Macro Sentiment"
          />

          <MetricCard
            id="metric-card-usdt"
            code="USDT EARN"
            title="Liquidez Flexible · 20% Target"
            primaryValue={`$${portfolio.usdt_dry_powder_available.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            unitLabel="USDT"
            deltaLabel={`APR ${portfolio.usdt_earn_apr_pct.toFixed(2)}%`}
            badgeState={report.global_badge}
            accentColor="emerald"
            progressPct={20}
            progressLeftLabel="RESERVA ESTRATÉGICA: 20%"
            progressRightLabel={`YIELD EST: +$${portfolio.usdt_earn_annual_yield_usdt}/AÑO`}
            metrics={[
              {
                label: 'APORTE QUINCENAL',
                value: `$150.000 COP (~${portfolio.dca_biweekly_usdt.toFixed(2)} USDT)`,
                tone: 'emerald',
              },
              {
                label: 'APORTE MENSUAL',
                value: `$300.000 COP (~${portfolio.dca_monthly_usdt.toFixed(2)} USDT)`,
                tone: 'emerald',
              },
              {
                label: 'CUOTA RESERVA (20%)',
                value: `${(portfolio.dca_biweekly_usdt * 0.2).toFixed(2)} USDT / QUINCENA`,
              },
              {
                label: 'DISPONIBILIDAD SPOT',
                value: 'REDENCIÓN INMEDIATA (T+0)',
                tone: 'yellow',
              },
            ]}
            footerNote="Reserva táctica para ejecutar órdenes límite/spot en caídas >= 5%"
          />
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-8">
            <RsiOscillator btc={btc} eth={eth} fng={fng} />
            <PortfolioBar
              portfolio={portfolio}
              globalBadge={report.global_badge}
            />
          </div>

          <div className="space-y-4 xl:col-span-4">
            <TerminalFeed
              items={report.terminal_feed}
              antiSpamStatus={report.anti_spam_status}
              cooldownHours={report.cooldown_hours}
            />

            <section
              id="telegram-outbox-panel"
              className="rounded-md border border-[#27272a] bg-[#18181b] p-4"
            >
              <div className="flex items-center justify-between border-b border-[#27272a] pb-2.5">
                <div className="flex items-center gap-2">
                  <Send className="h-3.5 w-3.5 text-[#eab308]" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                    TELEGRAM BOT PAYLOAD INSPECTOR
                  </h2>
                </div>
                <span className="rounded-sm border border-[#27272a] bg-[#09090b] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                  MARKDOWN V1
                </span>
              </div>

              <div className="mt-3 rounded-sm border border-[#27272a] bg-[#09090b] p-3 font-mono text-[11px] leading-relaxed text-zinc-300">
                {report.global_badge === 'Neutral' ? (
                  <div className="space-y-1.5">
                    <div className="text-[#eab308] font-semibold">
                      [FILTRO ANTI-SPAM ACTIVO — SILENCIO OPERATIVO]
                    </div>
                    <p className="text-zinc-400">
                      El centinela evalúa el mercado cada 4 horas mediante GitHub Actions.
                      Como el mercado se encuentra en rango neutral, no se emite ningún
                      mensaje a Telegram para evitar fatiga de alertas.
                    </p>
                    <div className="pt-1 text-[10px] text-zinc-500">
                      Cambia el selector superior a &quot;TEST: COMPRAR DIP&quot; o &quot;TEST: ACUMULAR USDT&quot;
                      para previsualizar el payload exacto de Telegram.
                    </div>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap text-[11px] text-zinc-200">
                    {`*[${
                      report.global_badge === 'Comprar Dip'
                        ? 'BUY DIP OPPORTUNITY'
                        : 'OVERHEAT / RISK ALERT'
                    }] — BTC/USDT*
━━━━━━━━━━━━━━━━━━━━━━
• Estado Centinela: ${report.global_badge}
• Precio Spot: $${btc.last_price.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} (${btc.price_change_pct_24h >= 0 ? '+' : ''}${btc.price_change_pct_24h.toFixed(2)}% 24h)
• RSI Diario (14D): ${btc.rsi_14_daily.toFixed(1)}
• Fear & Greed: ${fng.value}/100 (${fng.value_classification})

Acción Sugerida:
👉 ${report.global_suggested_action}`}
                  </pre>
                )}
              </div>

              <div className="mt-2.5 flex items-center justify-between font-mono text-[10px] text-zinc-400">
                <span className="inline-flex items-center gap-1">
                  <Database className="h-3 w-3 text-zinc-400" />
                  ENDPOINT: {snapshot.source_endpoint.replace('https://', '')}
                </span>
                <span>CLI: python -m backend.sentinel --dry-run</span>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
