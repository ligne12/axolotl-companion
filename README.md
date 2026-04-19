<div align="center">

# 🪷 Axolotl Companion

**Local-first AI companion** with an animated mascot, private LLM inference, and a full-stack web interface.

[![CI Backend](https://github.com/USER/axolotl-companion/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/USER/axolotl-companion/actions)
[![CI Frontend](https://github.com/USER/axolotl-companion/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/USER/axolotl-companion/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

![Demo](docs/screenshots/demo.gif)

</div>

---

## ✨ Features

- 🤖 **Private LLM inference** — served via [vLLM](https://github.com/vllm-project/vllm) on your own GPU (model configurable)
- 🎭 **Animated axolotl companion** — sprite reacts to thinking, searching, typing, idle states
- 🔍 **Tool calling** — web search (DuckDuckGo), weather, date/time, extensible
- 💬 **Multi-session chat** — persistent conversations with full history
- 🔐 **Auth** — Auth.js v5 + JWT, bcrypt passwords, refresh token rotation
- 📱 **PWA** — installable on mobile & desktop, responsive
- 🎨 **Themes** — dark/light/system + custom personas
- 🌍 **i18n** — French / English (extensible)
- 📊 **Observability** — Prometheus metrics, Grafana dashboards, Langfuse LLM traces

## 🏗️ Stack

<table>
<tr>
<td><b>Frontend</b></td>
<td>Next.js 15 (App Router, RSC) · React 19 · TypeScript strict · Tailwind v4 · shadcn/ui · Framer Motion · Zustand · TanStack Query · Zod · Auth.js v5 · Serwist (PWA)</td>
</tr>
<tr>
<td><b>Backend</b></td>
<td>FastAPI · Python 3.12 · SQLModel · Alembic · Pydantic v2 · structlog · OpenTelemetry · TaskIQ · uv</td>
</tr>
<tr>
<td><b>LLM</b></td>
<td>vLLM (configurable model via env vars)</td>
</tr>
<tr>
<td><b>Data</b></td>
<td>PostgreSQL 16 · Redis 7</td>
</tr>
<tr>
<td><b>Infra</b></td>
<td>Docker Compose (profiles) · Caddy (auto TLS) · GitHub Actions · Trivy</td>
</tr>
<tr>
<td><b>Observability</b></td>
<td>Prometheus · Grafana · Langfuse</td>
</tr>
</table>

## 🚀 Quick start

### Prerequisites

- **NVIDIA GPU** with sufficient VRAM for the model you plan to load
- **Docker** + **NVIDIA Container Toolkit**
- Enough system RAM for WSL/Linux + Docker overhead
- Linux / WSL2

### Launch in one command

```bash
git clone https://github.com/USER/axolotl-companion.git
cd axolotl-companion
cp .env.example .env
# Edit .env: set HF_TOKEN, JWT_SECRET, and your chosen model
make dev
```

Then open <https://chat.localhost>.

### Configuring the model

The LLM is configurable via environment variables in `.env`. Any model compatible with
vLLM works, from small 3B models up to large quantized ones, as long as it fits in your
VRAM. See [`docs/models.md`](docs/models.md) for recommended configurations depending on
your GPU budget and use case (chat, long context, tool use, etc.).

Example configurable options:

- Model path / HuggingFace repo
- Context window (`max-model-len`)
- KV cache dtype (fp8 / fp16)
- Concurrent sequences (`max-num-seqs`)
- GPU memory utilization
- Quantization backend (AWQ Marlin / GPTQ / NVFP4 / FP8 / BF16)

### Individual commands

```bash
make dev              # Start the whole stack in dev mode (HMR)
make prod             # Build and start in production mode
make test             # Run all tests (backend + frontend + e2e)
make lint             # Lint and type-check everything
make backup           # Snapshot the database
make obs              # Start Prometheus + Grafana + Langfuse
make clean            # Stop and remove containers & volumes
```

## 📂 Structure

```
axolotl-companion/
├── backend/              FastAPI + SQLModel + Alembic
├── frontend/             Next.js 15 + Auth.js + shadcn/ui
├── docker/               Dockerfiles (vLLM, proxy)
├── compose.yaml          Base Compose (dev-friendly)
├── compose.prod.yaml     Prod overrides
├── compose.observability.yaml
├── docs/                 Architecture docs, ADRs, screenshots
├── scripts/              Backup, seed, migration helpers
└── Makefile              Unified commands
```

Full architecture breakdown → [docs/architecture/README.md](docs/architecture/README.md)

## 🎮 The Axolotl

The axolotl reacts in real-time to the LLM's internal state:

| State | Trigger | Animation |
|---|---|---|
| `idle` | No activity | Slow blinking, gentle float |
| `listening` | User is typing | Ears perked up |
| `thinking` | Model is reasoning | Thought bubbles above head |
| `searching` | Tool call (web_search) | Magnifying glass, spinning |
| `typing` | Response streaming | Mouth moving |
| `happy` | User says thanks / positive | Jump + hearts |
| `confused` | Error / hallucination detected | Question mark |

## 📸 Screenshots

*Coming soon.*

## 🛣️ Roadmap

See [plan.md](plan.md) for the full phased roadmap.

Current status: **Phase 0 — Project setup** ⬅️

## 🤝 Contributing

Contributions welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## 📄 License

MIT — see [LICENSE](LICENSE)
