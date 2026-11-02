"""Market data extraction from Binance REST API & Alternative.me + Wilder RSI-14 calculation."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
import requests
from pydantic import BaseModel, Field

from backend.config import settings

REQUEST_HEADERS = {
    "User-Agent": "CryptoSentinelQuant/1.0",
    "Accept": "application/json",
}


class FearGreedSnapshot(BaseModel):
    """Validated schema for https://api.alternative.me/fng/?limit=1."""

    value: int = Field(..., ge=0, le=100, description="Fear & Greed numerical score (0-100)")
    value_classification: str = Field(..., description="Text classification (Fear, Greed, etc.)")
    timestamp: int = Field(..., description="Unix timestamp of the reading")
    time_until_update: int = Field(default=0, description="Seconds until next index update")


class CandlePoint(BaseModel):
    """Daily OHLCV + computed RSI data point."""

    timestamp: int
    date_label: str
    close: float
    rsi: float | None = None


class AssetMarketMetrics(BaseModel):
    """Validated schema combining Binance /ticker/24hr and daily klines RSI."""

    symbol: str
    asset: str
    last_price: float
    price_change_24h: float
    price_change_pct_24h: float
    weighted_avg_price: float
    high_24h: float
    low_24h: float
    volume_base_24h: float
    volume_quote_24h: float
    rsi_14_daily: float
    rsi_prev_daily: float
    rsi_series: list[CandlePoint] = Field(default_factory=list)
    updated_at: str


class MarketSnapshot(BaseModel):
    """Aggregate snapshot for all monitored assets and macro sentiment."""

    timestamp_utc: str
    btc: AssetMarketMetrics
    eth: AssetMarketMetrics
    fear_and_greed: FearGreedSnapshot
    source_endpoint: str


def compute_wilder_rsi_series(closes: list[float], period: int = 14) -> list[float | None]:
    """Calculate Wilder's smoothed RSI series for a sequence of closing prices."""
    if len(closes) < period + 1:
        return [50.0 for _ in closes]

    rsi_values: list[float | None] = [None] * len(closes)
    deltas = [closes[i] - closes[i - 1] for i in range(1, len(closes))]

    gains = [max(d, 0.0) for d in deltas[:period]]
    losses = [abs(min(d, 0.0)) for d in deltas[:period]]

    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period

    if avg_loss == 0:
        rsi_values[period] = 100.0
    else:
        rs = avg_gain / avg_loss
        rsi_values[period] = round(100.0 - (100.0 / (1.0 + rs)), 2)

    for idx in range(period, len(deltas)):
        delta = deltas[idx]
        gain = max(delta, 0.0)
        loss = abs(min(delta, 0.0))

        avg_gain = ((avg_gain * (period - 1)) + gain) / period
        avg_loss = ((avg_loss * (period - 1)) + loss) / period

        if avg_loss == 0:
            rsi_values[idx + 1] = 100.0
        else:
            rs = avg_gain / avg_loss
            rsi_values[idx + 1] = round(100.0 - (1.0 / (1.0 + rs)) * 100.0, 2)

    return rsi_values


def _binance_get(path: str, params: dict[str, Any], timeout: int = 10) -> tuple[Any, str]:
    """Perform GET request against Binance primary API with fallback."""
    endpoints = [settings.binance_api_base, settings.binance_api_fallback]
    last_err: Exception | None = None

    for base in endpoints:
        url = f"{base.rstrip('/')}/{path.lstrip('/')}"
        try:
            resp = requests.get(url, params=params, headers=REQUEST_HEADERS, timeout=timeout)
            resp.raise_for_status()
            return resp.json(), base
        except Exception as exc:
            last_err = exc
            continue

    raise RuntimeError(f"Unable to reach Binance endpoints ({endpoints}): {last_err}")


def fetch_fear_and_greed() -> FearGreedSnapshot:
    """Fetch and validate the Alternative.me Fear & Greed Index."""
    resp = requests.get(settings.fng_api_url, headers=REQUEST_HEADERS, timeout=10)
    resp.raise_for_status()
    payload = resp.json()

    data_list = payload.get("data", [])
    if not data_list:
        raise ValueError("Alternative.me F&G response did not contain data items.")

    item = data_list[0]
    return FearGreedSnapshot(
        value=int(item["value"]),
        value_classification=str(item["value_classification"]),
        timestamp=int(item["timestamp"]),
        time_until_update=int(item.get("time_until_update") or 0),
    )


def fetch_asset_metrics(symbol: str, asset_code: str, kline_limit: int = 60) -> tuple[AssetMarketMetrics, str]:
    """Fetch 24h ticker metrics and daily klines to compute Wilder RSI-14."""
    ticker_raw, endpoint_used = _binance_get("ticker/24hr", {"symbol": symbol})
    klines_raw, _ = _binance_get(
        "klines",
        {"symbol": symbol, "interval": "1d", "limit": kline_limit},
    )

    closes = [float(k[4]) for k in klines_raw]
    open_times = [int(k[0]) for k in klines_raw]
    rsi_series_vals = compute_wilder_rsi_series(closes, period=14)

    valid_rsis = [r for r in rsi_series_vals if r is not None]
    current_rsi = valid_rsis[-1] if valid_rsis else 50.0
    prev_rsi = valid_rsis[-2] if len(valid_rsis) >= 2 else current_rsi

    candle_points: list[CandlePoint] = []
    for ts, close_val, rsi_val in zip(open_times[-14:], closes[-14:], rsi_series_vals[-14:]):
        dt_str = datetime.fromtimestamp(ts / 1000, tz=timezone.utc).strftime("%d %b")
        candle_points.append(
            CandlePoint(
                timestamp=ts,
                date_label=dt_str,
                close=round(close_val, 2),
                rsi=rsi_val,
            )
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    metrics = AssetMarketMetrics(
        symbol=str(ticker_raw["symbol"]),
        asset=asset_code,
        last_price=float(ticker_raw["lastPrice"]),
        price_change_24h=float(ticker_raw["priceChange"]),
        price_change_pct_24h=float(ticker_raw["priceChangePercent"]),
        weighted_avg_price=float(ticker_raw["weightedAvgPrice"]),
        high_24h=float(ticker_raw["highPrice"]),
        low_24h=float(ticker_raw["lowPrice"]),
        volume_base_24h=float(ticker_raw["volume"]),
        volume_quote_24h=float(ticker_raw["quoteVolume"]),
        rsi_14_daily=current_rsi,
        rsi_prev_daily=prev_rsi,
        rsi_series=candle_points,
        updated_at=now_iso,
    )
    return metrics, endpoint_used


def fetch_market_snapshot() -> MarketSnapshot:
    """Gather complete market telemetry for BTC, ETH, and Fear & Greed Index."""
    btc_metrics, endpoint_used = fetch_asset_metrics("BTCUSDT", "BTC")
    eth_metrics, _ = fetch_asset_metrics("ETHUSDT", "ETH")
    fng = fetch_fear_and_greed()

    return MarketSnapshot(
        timestamp_utc=datetime.now(timezone.utc).isoformat(),
        btc=btc_metrics,
        eth=eth_metrics,
        fear_and_greed=fng,
        source_endpoint=endpoint_used,
    )
