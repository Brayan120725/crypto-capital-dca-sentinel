"""Configuration loader and institutional portfolio parameters."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


@dataclass(frozen=True)
class PortfolioStrategy:
    """Target allocation and DCA schedule parameters."""

    weight_btc: float = float(os.getenv("PORTFOLIO_WEIGHT_BTC", "0.50"))
    weight_eth: float = float(os.getenv("PORTFOLIO_WEIGHT_ETH", "0.30"))
    weight_usdt: float = float(os.getenv("PORTFOLIO_WEIGHT_USDT", "0.20"))

    dca_biweekly_cop: int = int(os.getenv("DCA_BIWEEKLY_COP", "150000"))
    dca_biweekly_usdt: float = float(os.getenv("DCA_BIWEEKLY_USDT", "45.25"))
    dca_monthly_cop: int = int(os.getenv("DCA_MONTHLY_COP", "300000"))
    dca_monthly_usdt: float = float(os.getenv("DCA_MONTHLY_USDT", "90.50"))
    usdt_earn_apr: float = float(os.getenv("USDT_EARN_APR", "6.80"))

    holdings_btc: float = float(os.getenv("HOLDINGS_BTC", "0.04250000"))
    holdings_eth: float = float(os.getenv("HOLDINGS_ETH", "0.86500000"))
    holdings_usdt_earn: float = float(os.getenv("HOLDINGS_USDT_EARN", "1240.00"))


@dataclass(frozen=True)
class SentinelRulesConfig:
    """Thresholds for the quantitative decision and alert engine."""

    buy_dip_drop_24h_pct: float = float(os.getenv("BUY_DIP_DROP_24H_PCT", "-5.0"))
    buy_dip_rsi_max: float = float(os.getenv("BUY_DIP_RSI_MAX", "35.0"))
    buy_dip_fng_max: int = int(os.getenv("BUY_DIP_FNG_MAX", "30"))

    overheat_fng_min: int = int(os.getenv("OVERHEAT_FNG_MIN", "80"))
    overheat_rsi_min: float = float(os.getenv("OVERHEAT_RSI_MIN", "75.0"))
    overheat_accel_24h_pct: float = float(os.getenv("OVERHEAT_ACCEL_24H_PCT", "2.5"))

    cooldown_hours: int = int(os.getenv("ALERT_COOLDOWN_HOURS", "12"))


@dataclass(frozen=True)
class Settings:
    """Global application settings."""

    telegram_bot_token: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    telegram_chat_id: str = os.getenv("TELEGRAM_CHAT_ID", "")

    binance_api_base: str = os.getenv(
        "BINANCE_API_BASE", "https://data-api.binance.vision/api/v3"
    )
    binance_api_fallback: str = os.getenv(
        "BINANCE_API_FALLBACK", "https://api.binance.com/api/v3"
    )
    fng_api_url: str = os.getenv(
        "FNG_API_URL", "https://api.alternative.me/fng/?limit=1"
    )

    state_file: Path = BASE_DIR / ".sentinel_state.json"
    feed_history_file: Path = BASE_DIR / "backend" / "alert_history.json"

    api_host: str = os.getenv("API_HOST", "0.0.0.0")
    api_port: int = int(os.getenv("API_PORT", "8000"))

    portfolio: PortfolioStrategy = PortfolioStrategy()
    rules: SentinelRulesConfig = SentinelRulesConfig()


settings = Settings()
