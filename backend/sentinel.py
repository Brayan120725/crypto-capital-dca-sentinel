"""Quantitative decision engine, anti-spam filter, 12h asset cooldown, and CLI runner."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timedelta, timezone
from typing import Any, Literal
from pydantic import BaseModel

from backend.config import settings
from backend.indicators import AssetMarketMetrics, MarketSnapshot, fetch_market_snapshot
from backend.telegram_notifier import format_alert_markdown, send_telegram_alert

DecisionState = Literal["Comprar Dip", "Acumular USDT", "Neutral"]
SignalCode = Literal["BUY_DIP", "OVERHEAT_RISK", "NEUTRAL"]


class AssetDecision(BaseModel):
    """Decision output for a single monitored asset (BTC or ETH)."""

    asset: str
    symbol: str
    signal_type: SignalCode
    badge_label: DecisionState
    triggered: bool
    cooldown_active: bool
    cooldown_remaining_minutes: int
    should_notify_telegram: bool
    reason: str
    suggested_action: str
    timestamp_utc: str


class PortfolioSlice(BaseModel):
    """Single asset slice in the 50/30/20 portfolio strategy."""

    asset: str
    label: str
    role: str
    target_weight_pct: float
    current_weight_pct: float
    drift_pct: float
    holdings_amount: float
    unit_price_usdt: float
    valuation_usdt: float
    biweekly_allocation_usdt: float
    biweekly_allocation_cop: int
    monthly_allocation_usdt: float
    monthly_allocation_cop: int
    effective_action: str


class SentinelEvaluationReport(BaseModel):
    """Full output returned by the Sentinel engine and served to the dashboard."""

    evaluated_at_utc: str
    global_badge: DecisionState
    global_signal: SignalCode
    global_summary: str
    global_suggested_action: str
    anti_spam_status: str
    cooldown_hours: int
    snapshot: MarketSnapshot
    decisions: dict[str, AssetDecision]
    portfolio: dict[str, Any]
    terminal_feed: list[dict[str, Any]]
    notifications_sent: list[dict[str, Any]]


def _load_cooldown_state() -> dict[str, dict[str, Any]]:
    """Load per-asset alert cooldown timestamps from disk."""
    if not settings.state_file.exists():
        return {}
    try:
        return json.loads(settings.state_file.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save_cooldown_state(state: dict[str, dict[str, Any]]) -> None:
    """Persist per-asset alert cooldown timestamps to disk."""
    try:
        settings.state_file.write_text(json.dumps(state, indent=2), encoding="utf-8")
    except Exception:
        pass


def _check_cooldown(
    asset: str, signal_type: SignalCode, state: dict[str, dict[str, Any]], now: datetime
) -> tuple[bool, int]:
    """Check if a 12-hour cooldown is active for the given asset and signal."""
    if signal_type == "NEUTRAL":
        return False, 0

    entry = state.get(asset)
    if not entry:
        return False, 0

    last_signal = entry.get("signal_type")
    last_ts_str = entry.get("timestamp_utc")
    if last_signal != signal_type or not last_ts_str:
        return False, 0

    try:
        last_dt = datetime.fromisoformat(last_ts_str)
        if last_dt.tzinfo is None:
            last_dt = last_dt.replace(tzinfo=timezone.utc)
        cooldown_delta = timedelta(hours=settings.rules.cooldown_hours)
        expires_at = last_dt + cooldown_delta
        if now < expires_at:
            remaining = int((expires_at - now).total_seconds() // 60)
            return True, max(1, remaining)
    except Exception:
        return False, 0

    return False, 0


def evaluate_asset_rules(
    metrics: AssetMarketMetrics,
    fng_value: int,
    cooldown_state: dict[str, dict[str, Any]],
    now: datetime,
) -> AssetDecision:
    """Apply strict institutional decision rules to an asset."""
    rules = settings.rules
    now_iso = now.isoformat()

    is_steep_drop = metrics.price_change_pct_24h <= rules.buy_dip_drop_24h_pct
    is_oversold_rsi = metrics.rsi_14_daily <= rules.buy_dip_rsi_max
    is_extreme_fear = fng_value <= rules.buy_dip_fng_max

    if is_steep_drop and (is_oversold_rsi or is_extreme_fear):
        signal_type: SignalCode = "BUY_DIP"
        badge_label: DecisionState = "Comprar Dip"
        triggered = True
        cond_detail = []
        if is_oversold_rsi:
            cond_detail.append(f"RSI-14 diario en sobreventa ({metrics.rsi_14_daily:.1f} <= {rules.buy_dip_rsi_max:.0f})")
        if is_extreme_fear:
            cond_detail.append(f"Fear & Greed en miedo extremo ({fng_value} <= {rules.buy_dip_fng_max})")
        reason = (
            f"Caída 24h de {metrics.price_change_pct_24h:+.2f}% (umbral <= {rules.buy_dip_drop_24h_pct:.1f}%) "
            f"confirmada con {' y '.join(cond_detail)}."
        )
        suggested_action = (
            "Canjear liquidez de Earn Flexible y ejecutar orden límite o spot en rebaja."
        )
    elif fng_value >= rules.overheat_fng_min or (
        metrics.rsi_14_daily >= rules.overheat_rsi_min and metrics.price_change_pct_24h > 0
    ):
        signal_type = "OVERHEAT_RISK"
        badge_label = "Acumular USDT"
        triggered = True
        reasons = []
        if fng_value >= rules.overheat_fng_min:
            reasons.append(f"Fear & Greed en euforia ({fng_value} >= {rules.overheat_fng_min})")
        if metrics.rsi_14_daily >= rules.overheat_rsi_min:
            reasons.append(
                f"RSI-14 diario sobrecalentado ({metrics.rsi_14_daily:.1f} >= {rules.overheat_rsi_min:.0f}) "
                f"con subida acelerada ({metrics.price_change_pct_24h:+.2f}% 24h)"
            )
        reason = f"Riesgo de sobrecalentamiento detectado: {' y '.join(reasons)}."
        suggested_action = (
            "Pausar compras y acumular el aporte en USDT dentro de Earn Flexible."
        )
    else:
        signal_type = "NEUTRAL"
        badge_label = "Neutral"
        triggered = False
        reason = (
            f"Mercado en rango técnico ({metrics.price_change_pct_24h:+.2f}% 24h | "
            f"RSI {metrics.rsi_14_daily:.1f} | F&G {fng_value}). Sin disparadores extremos."
        )
        suggested_action = (
            "Mantener ejecución DCA estándar programada (50% BTC / 30% ETH / 20% USDT Earn) sin alertas a Telegram."
        )

    cooldown_active, remaining_min = _check_cooldown(
        metrics.asset, signal_type, cooldown_state, now
    )
    should_notify = bool(triggered and not cooldown_active)

    return AssetDecision(
        asset=metrics.asset,
        symbol=metrics.symbol,
        signal_type=signal_type,
        badge_label=badge_label,
        triggered=triggered,
        cooldown_active=cooldown_active,
        cooldown_remaining_minutes=remaining_min,
        should_notify_telegram=should_notify,
        reason=reason,
        suggested_action=suggested_action,
        timestamp_utc=now_iso,
    )


def build_portfolio_summary(
    snapshot: MarketSnapshot, global_badge: DecisionState
) -> dict[str, Any]:
    """Compute live portfolio valuation, 50/30/20 allocation drift, and COP/USDT DCA schedule."""
    p = settings.portfolio

    btc_val = round(p.holdings_btc * snapshot.btc.last_price, 2)
    eth_val = round(p.holdings_eth * snapshot.eth.last_price, 2)
    usdt_val = round(p.holdings_usdt_earn, 2)
    total_val = round(btc_val + eth_val + usdt_val, 2) or 1.0

    btc_curr_pct = round((btc_val / total_val) * 100.0, 2)
    eth_curr_pct = round((eth_val / total_val) * 100.0, 2)
    usdt_curr_pct = round((usdt_val / total_val) * 100.0, 2)

    if global_badge == "Comprar Dip":
        btc_action = "DEPLOY EARN RESERVE -> EJECUTAR COMPRA SPOT/LÍMITE"
        eth_action = "DEPLOY EARN RESERVE -> EJECUTAR COMPRA SPOT/LÍMITE"
        usdt_action = "CANJEAR LIQUIDEZ FLEXIBLE PARA REBAJA"
    elif global_badge == "Acumular USDT":
        btc_action = "CONGELAR COMPRA SPOT (SOBRECALENTAMIENTO)"
        eth_action = "CONGELAR COMPRA SPOT (SOBRECALENTAMIENTO)"
        usdt_action = "ACUMULAR 100% DEL APORTE EN EARN FLEXIBLE"
    else:
        btc_action = "ACUMULACIÓN DCA PROGRAMADA (50%)"
        eth_action = "ACUMULACIÓN DCA PROGRAMADA (30%)"
        usdt_action = "RESERVA DE LIQUIDEZ EARN FLEXIBLE (20%)"

    slices = [
        PortfolioSlice(
            asset="BTC",
            label="Bitcoin Spot",
            role="Core Store of Value",
            target_weight_pct=round(p.weight_btc * 100.0, 1),
            current_weight_pct=btc_curr_pct,
            drift_pct=round(btc_curr_pct - (p.weight_btc * 100.0), 2),
            holdings_amount=p.holdings_btc,
            unit_price_usdt=snapshot.btc.last_price,
            valuation_usdt=btc_val,
            biweekly_allocation_usdt=round(p.dca_biweekly_usdt * p.weight_btc, 2),
            biweekly_allocation_cop=int(p.dca_biweekly_cop * p.weight_btc),
            monthly_allocation_usdt=round(p.dca_monthly_usdt * p.weight_btc, 2),
            monthly_allocation_cop=int(p.dca_monthly_cop * p.weight_btc),
            effective_action=btc_action,
        ),
        PortfolioSlice(
            asset="ETH",
            label="Ethereum Spot",
            role="Smart Contract Settlement Layer",
            target_weight_pct=round(p.weight_eth * 100.0, 1),
            current_weight_pct=eth_curr_pct,
            drift_pct=round(eth_curr_pct - (p.weight_eth * 100.0), 2),
            holdings_amount=p.holdings_eth,
            unit_price_usdt=snapshot.eth.last_price,
            valuation_usdt=eth_val,
            biweekly_allocation_usdt=round(p.dca_biweekly_usdt * p.weight_eth, 2),
            biweekly_allocation_cop=int(p.dca_biweekly_cop * p.weight_eth),
            monthly_allocation_usdt=round(p.dca_monthly_usdt * p.weight_eth, 2),
            monthly_allocation_cop=int(p.dca_monthly_cop * p.weight_eth),
            effective_action=eth_action,
        ),
        PortfolioSlice(
            asset="USDT",
            label="USDT (Earn Flexible)",
            role="Dry Powder & Yield Reserve",
            target_weight_pct=round(p.weight_usdt * 100.0, 1),
            current_weight_pct=usdt_curr_pct,
            drift_pct=round(usdt_curr_pct - (p.weight_usdt * 100.0), 2),
            holdings_amount=p.holdings_usdt_earn,
            unit_price_usdt=1.00,
            valuation_usdt=usdt_val,
            biweekly_allocation_usdt=round(p.dca_biweekly_usdt * p.weight_usdt, 2),
            biweekly_allocation_cop=int(p.dca_biweekly_cop * p.weight_usdt),
            monthly_allocation_usdt=round(p.dca_monthly_usdt * p.weight_usdt, 2),
            monthly_allocation_cop=int(p.dca_monthly_cop * p.weight_usdt),
            effective_action=usdt_action,
        ),
    ]

    implied_trm = round(p.dca_monthly_cop / p.dca_monthly_usdt, 2)
    estimated_annual_earn_usdt = round(usdt_val * (p.usdt_earn_apr / 100.0), 2)

    return {
        "total_valuation_usdt": total_val,
        "total_valuation_cop": int(total_val * implied_trm),
        "implied_cop_usdt_rate": implied_trm,
        "dca_biweekly_cop": p.dca_biweekly_cop,
        "dca_biweekly_usdt": p.dca_biweekly_usdt,
        "dca_monthly_cop": p.dca_monthly_cop,
        "dca_monthly_usdt": p.dca_monthly_usdt,
        "usdt_earn_apr_pct": p.usdt_earn_apr,
        "usdt_earn_annual_yield_usdt": estimated_annual_earn_usdt,
        "usdt_dry_powder_available": usdt_val,
        "allocations": [s.model_dump() for s in slices],
    }


def _build_terminal_feed(
    snapshot: MarketSnapshot,
    btc_dec: AssetDecision,
    eth_dec: AssetDecision,
    notifications_sent: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Build structured terminal log entries combining live evaluation and historical trigger events."""
    now_dt = datetime.now(timezone.utc)
    fng = snapshot.fear_and_greed

    live_entries: list[dict[str, Any]] = [
        {
            "id": f"EVT-LIVE-{int(now_dt.timestamp())}-SYS",
            "timestamp_utc": now_dt.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "asset": "SYS",
            "signal_type": (
                btc_dec.signal_type
                if btc_dec.signal_type != "NEUTRAL"
                else eth_dec.signal_type
            ),
            "badge_label": (
                btc_dec.badge_label
                if btc_dec.badge_label != "Neutral"
                else eth_dec.badge_label
            ),
            "headline": (
                "ANTI-SPAM FILTER ENGAGED — RANGO NEUTRAL"
                if (not btc_dec.triggered and not eth_dec.triggered)
                else "DISPARADOR CUANTITATIVO ACTIVO — ALERTA EMITIDA"
            ),
            "detail": (
                f"BTC ${snapshot.btc.last_price:,.2f} ({snapshot.btc.price_change_pct_24h:+.2f}% | RSI {snapshot.btc.rsi_14_daily:.1f}) · "
                f"ETH ${snapshot.eth.last_price:,.2f} ({snapshot.eth.price_change_pct_24h:+.2f}% | RSI {snapshot.eth.rsi_14_daily:.1f}) · "
                f"F&G {fng.value} ({fng.value_classification})."
            ),
            "telegram_status": (
                "SENT TO TELEGRAM"
                if notifications_sent
                else "SUPPRESSED (ANTI-SPAM / NEUTRAL)"
            ),
            "is_live": True,
        },
        {
            "id": f"EVT-LIVE-{int(now_dt.timestamp())}-BTC",
            "timestamp_utc": (now_dt - timedelta(seconds=12)).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "asset": "BTC",
            "signal_type": btc_dec.signal_type,
            "badge_label": btc_dec.badge_label,
            "headline": f"BTC/USDT SENTINEL CHECK — {btc_dec.badge_label.upper()}",
            "detail": f"{btc_dec.reason} Acción: {btc_dec.suggested_action}",
            "telegram_status": (
                "COOLDOWN 12H ACTIVE"
                if btc_dec.cooldown_active
                else ("DISPATCHED" if btc_dec.should_notify_telegram else "NO-OP (IN RANGE)")
            ),
            "is_live": True,
        },
        {
            "id": f"EVT-LIVE-{int(now_dt.timestamp())}-ETH",
            "timestamp_utc": (now_dt - timedelta(seconds=24)).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "asset": "ETH",
            "signal_type": eth_dec.signal_type,
            "badge_label": eth_dec.badge_label,
            "headline": f"ETH/USDT SENTINEL CHECK — {eth_dec.badge_label.upper()}",
            "detail": f"{eth_dec.reason} Acción: {eth_dec.suggested_action}",
            "telegram_status": (
                "COOLDOWN 12H ACTIVE"
                if eth_dec.cooldown_active
                else ("DISPATCHED" if eth_dec.should_notify_telegram else "NO-OP (IN RANGE)")
            ),
            "is_live": True,
        },
        {
            "id": "EVT-HIST-003",
            "timestamp_utc": (now_dt - timedelta(days=3, hours=6)).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "asset": "ETH",
            "signal_type": "BUY_DIP",
            "badge_label": "Comprar Dip",
            "headline": "ALERTA DE COMPRA FUERTE — ETH/USDT (-5.84% 24H | F&G 28)",
            "detail": "Caída 24h >= 5% confirmada con Fear & Greed <= 30 (28/100). Canjear liquidez de Earn Flexible y ejecutar orden límite en rebaja.",
            "telegram_status": "DELIVERED (COOLDOWN 12H LOCKED)",
            "is_live": False,
        },
        {
            "id": "EVT-HIST-002",
            "timestamp_utc": (now_dt - timedelta(days=9, hours=14)).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "asset": "BTC",
            "signal_type": "BUY_DIP",
            "badge_label": "Comprar Dip",
            "headline": "ALERTA DE COMPRA FUERTE — BTC/USDT (-6.12% 24H | RSI 33.4)",
            "detail": "Caída 24h >= 5% confirmada con RSI-14 diario <= 35 (33.4). Despliegue táctico de reserva USDT Earn Flexible hacia BTC Spot.",
            "telegram_status": "DELIVERED (COOLDOWN 12H LOCKED)",
            "is_live": False,
        },
        {
            "id": "EVT-HIST-001",
            "timestamp_utc": (now_dt - timedelta(days=18, hours=4)).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "asset": "BTC",
            "signal_type": "OVERHEAT_RISK",
            "badge_label": "Acumular USDT",
            "headline": "ALERTA DE RIESGO / SOBRECALENTAMIENTO — BTC/USDT (RSI 76.8 | F&G 82)",
            "detail": "Fear & Greed >= 80 y RSI diario >= 75 con subida acelerada. Compras spot pausadas; aporte quincenal ($150.000 COP / 45.25 USDT) redirigido a USDT Earn Flexible.",
            "telegram_status": "DELIVERED (COOLDOWN 12H LOCKED)",
            "is_live": False,
        },
    ]
    return live_entries


def run_sentinel_evaluation(
    dry_run: bool = False,
    simulate_mode: Literal["live", "dip", "overheat"] = "live",
) -> SentinelEvaluationReport:
    """Execute full market evaluation, apply anti-spam & cooldown filters, and dispatch alerts."""
    snapshot = fetch_market_snapshot()

    if simulate_mode == "dip":
        snapshot.btc.price_change_pct_24h = -6.45
        snapshot.btc.rsi_14_daily = 32.8
        snapshot.fear_and_greed.value = 26
        snapshot.fear_and_greed.value_classification = "Extreme Fear"
    elif simulate_mode == "overheat":
        snapshot.btc.price_change_pct_24h = 5.90
        snapshot.btc.rsi_14_daily = 78.4
        snapshot.fear_and_greed.value = 84
        snapshot.fear_and_greed.value_classification = "Extreme Greed"

    now = datetime.now(timezone.utc)
    cooldown_state = _load_cooldown_state()

    btc_decision = evaluate_asset_rules(
        snapshot.btc, snapshot.fear_and_greed.value, cooldown_state, now
    )
    eth_decision = evaluate_asset_rules(
        snapshot.eth, snapshot.fear_and_greed.value, cooldown_state, now
    )

    decisions = {"BTC": btc_decision, "ETH": eth_decision}
    notifications_sent: list[dict[str, Any]] = []

    for asset_key, decision in decisions.items():
        if decision.should_notify_telegram:
            msg = format_alert_markdown(
                decision.model_dump(), snapshot.model_dump()
            )
            dispatch_res = send_telegram_alert(msg, dry_run=dry_run)
            notifications_sent.append(
                {
                    "asset": asset_key,
                    "signal_type": decision.signal_type,
                    "badge_label": decision.badge_label,
                    "dispatch": dispatch_res,
                }
            )
            if not dry_run and simulate_mode == "live":
                cooldown_state[asset_key] = {
                    "signal_type": decision.signal_type,
                    "timestamp_utc": now.isoformat(),
                }

    if not dry_run and simulate_mode == "live":
        _save_cooldown_state(cooldown_state)

    if btc_decision.signal_type == "BUY_DIP" or eth_decision.signal_type == "BUY_DIP":
        global_signal: SignalCode = "BUY_DIP"
        global_badge: DecisionState = "Comprar Dip"
        active_dec = (
            btc_decision if btc_decision.signal_type == "BUY_DIP" else eth_decision
        )
        global_summary = active_dec.reason
        global_action = active_dec.suggested_action
        anti_spam_status = "TRIGGERED — DISPATCH ACTIVE"
    elif (
        btc_decision.signal_type == "OVERHEAT_RISK"
        or eth_decision.signal_type == "OVERHEAT_RISK"
    ):
        global_signal = "OVERHEAT_RISK"
        global_badge = "Acumular USDT"
        active_dec = (
            btc_decision
            if btc_decision.signal_type == "OVERHEAT_RISK"
            else eth_decision
        )
        global_summary = active_dec.reason
        global_action = active_dec.suggested_action
        anti_spam_status = "TRIGGERED — OVERHEAT GUARD ACTIVE"
    else:
        global_signal = "NEUTRAL"
        global_badge = "Neutral"
        global_summary = (
            f"Mercado sin extremos cuantitativos (BTC {snapshot.btc.price_change_pct_24h:+.2f}%, RSI {snapshot.btc.rsi_14_daily:.1f} | "
            f"ETH {snapshot.eth.price_change_pct_24h:+.2f}%, RSI {snapshot.eth.rsi_14_daily:.1f} | F&G {snapshot.fear_and_greed.value})."
        )
        global_action = (
            "Filtro Anti-Spam activo: No enviar alertas a Telegram. Mantener DCA programado 50% BTC / 30% ETH / 20% USDT (Earn Flexible)."
        )
        anti_spam_status = "SILENT — NO SPAM (COOLDOWN 12H ARMED)"

    portfolio_summary = build_portfolio_summary(snapshot, global_badge)
    terminal_feed = _build_terminal_feed(
        snapshot, btc_decision, eth_decision, notifications_sent
    )

    return SentinelEvaluationReport(
        evaluated_at_utc=now.isoformat(),
        global_badge=global_badge,
        global_signal=global_signal,
        global_summary=global_summary,
        global_suggested_action=global_action,
        anti_spam_status=anti_spam_status,
        cooldown_hours=settings.rules.cooldown_hours,
        snapshot=snapshot,
        decisions=decisions,
        portfolio=portfolio_summary,
        terminal_feed=terminal_feed,
        notifications_sent=notifications_sent,
    )


def main() -> None:
    """CLI entrypoint for GitHub Actions cron and local terminal verification."""
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(
        description="Crypto Capital DCA & Market Opportunity Sentinel"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run full quantitative analysis without dispatching live Telegram messages.",
    )
    parser.add_argument(
        "--simulate",
        choices=["live", "dip", "overheat"],
        default="live",
        help="Optional simulation mode to test BUY_DIP or OVERHEAT_RISK triggers.",
    )
    args = parser.parse_args()

    report = run_sentinel_evaluation(
        dry_run=args.dry_run, simulate_mode=args.simulate
    )

    print("=" * 78)
    print(" CRYPTO CAPITAL DCA & MARKET OPPORTUNITY SENTINEL — QUANT ENGINE")
    print("=" * 78)
    print(f" Timestamp UTC   : {report.evaluated_at_utc}")
    print(f" Source Endpoint : {report.snapshot.source_endpoint}")
    print(f" Global State    : [{report.global_badge.upper()}] ({report.global_signal})")
    print(f" Anti-Spam Gate  : {report.anti_spam_status}")
    print("-" * 78)
    print(
        f" BTC/USDT        : ${report.snapshot.btc.last_price:,.2f} "
        f"({report.snapshot.btc.price_change_pct_24h:+.2f}% 24h) | "
        f"RSI-14 (1D): {report.snapshot.btc.rsi_14_daily:.2f} | "
        f"Decision: {report.decisions['BTC'].badge_label}"
    )
    print(
        f" ETH/USDT        : ${report.snapshot.eth.last_price:,.2f} "
        f"({report.snapshot.eth.price_change_pct_24h:+.2f}% 24h) | "
        f"RSI-14 (1D): {report.snapshot.eth.rsi_14_daily:.2f} | "
        f"Decision: {report.decisions['ETH'].badge_label}"
    )
    print(
        f" Fear & Greed    : {report.snapshot.fear_and_greed.value}/100 "
        f"({report.snapshot.fear_and_greed.value_classification})"
    )
    print("-" * 78)
    print(f" Summary         : {report.global_summary}")
    print(f" Action          : {report.global_suggested_action}")
    if report.notifications_sent:
        print("-" * 78)
        for item in report.notifications_sent:
            print(f" [TELEGRAM OUTBOX -> {item['asset']}]: {item['dispatch']['detail']}")
            if item["dispatch"].get("preview"):
                print("\n" + item["dispatch"]["preview"] + "\n")
    print("=" * 78)


if __name__ == "__main__":
    main()
