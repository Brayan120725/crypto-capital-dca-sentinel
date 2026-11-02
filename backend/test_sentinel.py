"""Unit tests for the Sentinel Quantitative Decision Engine & Wilder RSI-14."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from backend.indicators import AssetMarketMetrics, compute_wilder_rsi_series
from backend.sentinel import evaluate_asset_rules


def _mock_metrics(
    asset: str = "BTC",
    price_change_pct_24h: float = -0.5,
    rsi_14_daily: float = 48.0,
) -> AssetMarketMetrics:
    return AssetMarketMetrics(
        symbol=f"{asset}USDT",
        asset=asset,
        last_price=77000.0 if asset == "BTC" else 2270.0,
        price_change_24h=-400.0,
        price_change_pct_24h=price_change_pct_24h,
        weighted_avg_price=77500.0,
        high_24h=78500.0,
        low_24h=76500.0,
        volume_base_24h=10500.0,
        volume_quote_24h=810000000.0,
        rsi_14_daily=rsi_14_daily,
        rsi_prev_daily=50.0,
        rsi_series=[],
        updated_at=datetime.now(timezone.utc).isoformat(),
    )


def test_wilder_rsi_series_bounds() -> None:
    closes = [100.0 + (i * 1.5 if i % 2 == 0 else -0.8 * i) for i in range(30)]
    rsi_vals = compute_wilder_rsi_series(closes, period=14)
    valid = [v for v in rsi_vals if v is not None]
    assert len(valid) > 0
    for val in valid:
        assert 0.0 <= val <= 100.0


def test_buy_dip_trigger_with_rsi_and_drop() -> None:
    now = datetime.now(timezone.utc)
    metrics = _mock_metrics(price_change_pct_24h=-5.4, rsi_14_daily=33.5)
    decision = evaluate_asset_rules(metrics, fng_value=42, cooldown_state={}, now=now)
    assert decision.signal_type == "BUY_DIP"
    assert decision.badge_label == "Comprar Dip"
    assert decision.triggered is True
    assert decision.should_notify_telegram is True


def test_buy_dip_trigger_with_fng_and_drop() -> None:
    now = datetime.now(timezone.utc)
    metrics = _mock_metrics(price_change_pct_24h=-6.1, rsi_14_daily=41.0)
    decision = evaluate_asset_rules(metrics, fng_value=25, cooldown_state={}, now=now)
    assert decision.signal_type == "BUY_DIP"
    assert decision.badge_label == "Comprar Dip"
    assert decision.triggered is True
    assert decision.should_notify_telegram is True


def test_overheat_trigger_with_high_fng() -> None:
    now = datetime.now(timezone.utc)
    metrics = _mock_metrics(price_change_pct_24h=1.2, rsi_14_daily=64.0)
    decision = evaluate_asset_rules(metrics, fng_value=82, cooldown_state={}, now=now)
    assert decision.signal_type == "OVERHEAT_RISK"
    assert decision.badge_label == "Acumular USDT"
    assert decision.triggered is True
    assert decision.should_notify_telegram is True


def test_neutral_range_suppresses_telegram() -> None:
    now = datetime.now(timezone.utc)
    metrics = _mock_metrics(price_change_pct_24h=-1.2, rsi_14_daily=34.0)
    decision = evaluate_asset_rules(metrics, fng_value=37, cooldown_state={}, now=now)
    assert decision.signal_type == "NEUTRAL"
    assert decision.badge_label == "Neutral"
    assert decision.triggered is False
    assert decision.should_notify_telegram is False


def test_12h_cooldown_blocks_duplicate_alert() -> None:
    now = datetime.now(timezone.utc)
    two_hours_ago = (now - timedelta(hours=2)).isoformat()
    cooldown_state = {
        "BTC": {
            "signal_type": "BUY_DIP",
            "timestamp_utc": two_hours_ago,
        }
    }
    metrics = _mock_metrics(asset="BTC", price_change_pct_24h=-6.0, rsi_14_daily=31.0)
    decision = evaluate_asset_rules(
        metrics, fng_value=24, cooldown_state=cooldown_state, now=now
    )
    assert decision.signal_type == "BUY_DIP"
    assert decision.triggered is True
    assert decision.cooldown_active is True
    assert decision.should_notify_telegram is False
    assert decision.cooldown_remaining_minutes > 500
