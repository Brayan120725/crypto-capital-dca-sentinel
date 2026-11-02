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

---

## 2. Estructura del Proyecto

```text
├── .github/
│   └── workflows/
│       └── monitor.yml           # Cron job autónomo cada 4h en GitHub Actions
├── backend/
│   ├── __init__.py
│   ├── init.py
│   ├── config.py                 # Carga tipada de variables de entorno (.env)
│   ├── indicators.py             # Fetch de Binance REST + Alternative.me y cálculo Wilder RSI-14
│   ├── sentinel.py               # Motor de reglas, anti-spam, cooldown 12h y CLI (--dry-run)
│   ├── telegram_notifier.py      # Despacho de alertas con formato Markdown a Telegram
│   └── app.py                    # Servidor FastAPI (/api/sentinel, /api/health)
├── frontend/                     # Dashboard Financiero (Vite + React + TypeScript + Tailwind CSS)
│   ├── src/
│   │   ├── components/
│   │   │   ├── MetricCard.tsx    # Tarjetas de métricas clave (BTC, ETH, F&G, USDT Earn)
│   │   │   ├── DecisionBadge.tsx # Estado: "Acumular USDT" | "Comprar Dip" | "Neutral"
│   │   │   ├── RsiOscillator.tsx # Oscilador RSI-14 diario y matriz de disparadores
│   │   │   ├── PortfolioBar.tsx  # Barra y tabla institucional de distribución 50/30/20
│   │   │   └── TerminalFeed.tsx  # Historial de evaluaciones y alertas emitidas
│   │   └── App.tsx
├── .env.example
├── .gitignore
├── requirements.txt
└── README.md
```

---

## 3. Ejecución Local

### Backend & CLI (`venv`)
```powershell
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt

# Copia .env.example a .env y configura TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID
Copy-Item .env.example .env

# Prueba en terminal sin enviar mensajes reales a Telegram (Modo Live / Simulación)
.\venv\Scripts\python -m backend.sentinel --dry-run
.\venv\Scripts\python -m backend.sentinel --dry-run --simulate dip
.\venv\Scripts\python -m backend.sentinel --dry-run --simulate overheat

# Levantar servidor API (FastAPI en puerto 8000)
.\venv\Scripts\python -m backend.app
```

### Frontend Financial Terminal
```powershell
cd frontend
npm install
npm run dev
```

---

## 4. Despliegue Autónomo en GitHub Actions

Configura los siguientes *Repository Secrets* en GitHub (`Settings > Secrets and variables > Actions`):
- `TELEGRAM_BOT_TOKEN`: Token del bot entregado por `@BotFather`.
- `TELEGRAM_CHAT_ID`: ID numérico de tu chat o canal de alertas.

El flujo `.github/workflows/monitor.yml` se ejecuta automáticamente cada 4 horas (`0 */4 * * *`) y también permite ejecución manual (`workflow_dispatch`) con soporte para `dry_run` y modos de prueba.
