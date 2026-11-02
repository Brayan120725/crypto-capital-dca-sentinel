"""Telegram Bot notification dispatcher with institutional Markdown formatting."""

from __future__ import annotations

from typing import Any
import requests

from backend.config import settings


def format_alert_markdown(alert: dict[str, Any], snapshot: dict[str, Any]) -> str:
    """Format an actionable quantitative alert message in Telegram Markdown."""
    signal_type = alert["signal_type"]
    asset = alert["asset"]
    badge = alert["badge_label"]
    fng = snapshot["fear_and_greed"]

    header_icon = "🟢 [BUY DIP OPPORTUNITY]" if signal_type == "BUY_DIP" else "🔴 [OVERHEAT / RISK ALERT]"

    asset_data = snapshot["btc"] if asset == "BTC" else snapshot["eth"]
    price_str = f"${asset_data['last_price']:,.2f}"
    change_str = f"{asset_data['price_change_pct_24h']:+.2f}%"
    rsi_str = f"{asset_data['rsi_14_daily']:.1f}"

    lines = [
        f"*{header_icon} — {asset}/USDT*",
        "━━━━━━━━━━━━━━━━━━━━━━",
        f"• *Estado Centinela:* `{badge}`",
        f"• *Precio Spot:* `{price_str}` (`{change_str}` 24h)",
        f"• *RSI Diario (14D):* `{rsi_str}`",
        f"• *Fear & Greed Index:* `{fng['value']}/100 ({fng['value_classification']})`",
        "",
        "*Razón Cuantitativa:*",
        f"_{alert['reason']}_",
        "",
        "*Acción Sugerida (Portafolio 50/30/20):*",
        f"👉 {alert['suggested_action']}",
        "",
        "*Plan DCA Base:*",
        f"• Quincenal: `$150.000 COP (~{settings.portfolio.dca_biweekly_usdt:.2f} USDT)`",
        f"• Mensual: `$300.000 COP (~{settings.portfolio.dca_monthly_usdt:.2f} USDT)`",
        f"• Timestamp UTC: `{alert['timestamp_utc']}`",
    ]
    return "\n".join(lines)


def send_telegram_alert(message_markdown: str, dry_run: bool = False) -> dict[str, Any]:
    """Send formatted Markdown message to Telegram chat or simulate if dry_run."""
    if dry_run:
        return {
            "delivered": False,
            "dry_run": True,
            "detail": "Dry-run active: message rendered to terminal only.",
            "preview": message_markdown,
        }

    token = settings.telegram_bot_token.strip()
    chat_id = settings.telegram_chat_id.strip()

    if not token or not chat_id or token == "your_telegram_bot_token_here":
        return {
            "delivered": False,
            "dry_run": False,
            "detail": "Telegram credentials not configured (.env). Skipping network dispatch.",
            "preview": message_markdown,
        }

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message_markdown,
        "parse_mode": "Markdown",
        "disable_web_page_preview": True,
    }
    resp = requests.post(url, json=payload, timeout=10)
    resp.raise_for_status()
    return {
        "delivered": True,
        "dry_run": False,
        "detail": "Delivered via Telegram Bot API.",
        "response": resp.json(),
    }
