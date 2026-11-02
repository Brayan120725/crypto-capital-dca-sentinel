export type DecisionState = 'Comprar Dip' | 'Acumular USDT' | 'Neutral';
export type SignalCode = 'BUY_DIP' | 'OVERHEAT_RISK' | 'NEUTRAL';
export type SimulationMode = 'live' | 'dip' | 'overheat';

export interface CandlePoint {
  timestamp: number;
  date_label: string;
  close: number;
  rsi: number | null;
}

export interface AssetMarketMetrics {
  symbol: string;
  asset: string;
  last_price: number;
  price_change_24h: number;
  price_change_pct_24h: number;
  weighted_avg_price: number;
  high_24h: number;
  low_24h: number;
  volume_base_24h: number;
  volume_quote_24h: number;
  rsi_14_daily: number;
  rsi_prev_daily: number;
  rsi_series: CandlePoint[];
  updated_at: string;
}

export interface FearGreedSnapshot {
  value: number;
  value_classification: string;
  timestamp: number;
  time_until_update: number;
}

export interface AssetDecision {
  asset: string;
  symbol: string;
  signal_type: SignalCode;
  badge_label: DecisionState;
  triggered: boolean;
  cooldown_active: boolean;
  cooldown_remaining_minutes: number;
  should_notify_telegram: boolean;
  reason: string;
  suggested_action: string;
  timestamp_utc: string;
}

export interface PortfolioSlice {
  asset: string;
  label: string;
  role: string;
  target_weight_pct: number;
  current_weight_pct: number;
  drift_pct: number;
  holdings_amount: number;
  unit_price_usdt: number;
  valuation_usdt: number;
  biweekly_allocation_usdt: number;
  biweekly_allocation_cop: number;
  monthly_allocation_usdt: number;
  monthly_allocation_cop: number;
  effective_action: string;
}

export interface PortfolioSummary {
  total_valuation_usdt: number;
  total_valuation_cop: number;
  implied_cop_usdt_rate: number;
  dca_biweekly_cop: number;
  dca_biweekly_usdt: number;
  dca_monthly_cop: number;
  dca_monthly_usdt: number;
  usdt_earn_apr_pct: number;
  usdt_earn_annual_yield_usdt: number;
  usdt_dry_powder_available: number;
  allocations: PortfolioSlice[];
}

export interface TerminalFeedItem {
  id: string;
  timestamp_utc: string;
  asset: string;
  signal_type: SignalCode;
  badge_label: DecisionState;
  headline: string;
  detail: string;
  telegram_status: string;
  is_live: boolean;
}

export interface SentinelEvaluationReport {
  evaluated_at_utc: string;
  global_badge: DecisionState;
  global_signal: SignalCode;
  global_summary: string;
  global_suggested_action: string;
  anti_spam_status: string;
  cooldown_hours: number;
  snapshot: {
    timestamp_utc: string;
    btc: AssetMarketMetrics;
    eth: AssetMarketMetrics;
    fear_and_greed: FearGreedSnapshot;
    source_endpoint: string;
  };
  decisions: {
    BTC: AssetDecision;
    ETH: AssetDecision;
  };
  portfolio: PortfolioSummary;
  terminal_feed: TerminalFeedItem[];
}
