"""FastAPI server exposing real-time telemetry, decision rules, and simulation endpoints to the dashboard."""

from __future__ import annotations

from typing import Literal
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.sentinel import SentinelEvaluationReport, run_sentinel_evaluation

app = FastAPI(
    title="Crypto Capital DCA & Market Opportunity Sentinel API",
    description="Quantitative market telemetry, Wilder RSI-14, Fear & Greed, and 50/30/20 DCA Decision Engine.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "crypto-capital-dca-sentinel",
        "version": "1.0.0",
    }


@app.get("/api/sentinel", response_model=SentinelEvaluationReport)
def get_sentinel_telemetry(
    mode: Literal["live", "dip", "overheat"] = Query(
        default="live",
        description="Market evaluation mode: 'live' (Binance + Alternative.me), 'dip' (stress-test Buy Dip trigger), or 'overheat' (stress-test Overheat trigger).",
    ),
) -> SentinelEvaluationReport:
    """Return full market telemetry, Wilder RSI-14 series, portfolio distribution, and decision badge."""
    return run_sentinel_evaluation(dry_run=True, simulate_mode=mode)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.app:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=False,
    )
