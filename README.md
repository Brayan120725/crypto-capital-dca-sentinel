# Crypto Capital DCA & Market Opportunity Sentinel

Sistema integral de monitoreo cuantitativo de acumulación cripto (**50% BTC / 30% ETH / 20% USDT Earn Flexible**) y alertas tácticas de oportunidad de mercado en **Telegram**, acompañado de un **Dashboard Financiero Institucional** estilo Bloomberg / Linear / Raycast.

---

## 1. Arquitectura y Estrategia de Portafolio

### Distribución Objetivo (50 / 30 / 20)
| Activo | Ponderación Objetivo | Rol Estratégico | DCA Quincenal (`$150.000 COP`) | DCA Mensual (`$300.000 COP`) |
| :--- | :---: | :--- | :---: | :---: |
| **BTC** | **50%** | Core Store of Value | `$75.000 COP` (~`22.62 USDT`) | `$150.000 COP` (~`45.25 USDT`) |
| **ETH** | **30%** | Smart Contract Settlement Layer | `$45.000 COP` (~`13.57 USDT`) | `$90.000 COP` (~`27.15 USDT`) |
| **USDT (Earn Flexible)** | **20%** | Reserva de Liquidez + Yield | `$30.000 COP` (~`9.05 USDT`) | `$60.000 COP` (~`18.10 USDT`) |

### Motor de Reglas de Decisión (`backend/sentinel.py`)
1. **Alerta de Compra Fuerte (`Comprar Dip` / `BUY_DIP`):**
   - **Disparador:** Caída de BTC o ETH en 24h >= 5% (`price_change_pct_24h <= -5.0`) **Y** (`RSI-14 diario <= 35` **O** `Fear & Greed <= 30`).
   - **Acción Sugerida:** Canjear liquidez de Earn Flexible y ejecutar orden límite o spot en rebaja.
2. **Alerta de Riesgo / Sobrecalentamiento (`Acumular USDT` / `OVERHEAT_RISK`):**
   - **Disparador:** `Fear & Greed >= 80` **O** `RSI-14 diario >= 75` con subida acelerada.
   - **Acción Sugerida:** Pausar compras y acumular el aporte en USDT dentro de Earn Flexible.
3. **Filtro Anti-Spam & Cooldown:**
   - En mercado lateral o neutral (`Neutral`), **no se envía ninguna alerta a Telegram**.
   - **Cooldown de 12 horas por activo** persistido en `.sentinel_state.json` para evitar alertas repetidas ante fluctuaciones sobre el umbral.
