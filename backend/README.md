# Axolotl Companion — backend

FastAPI service for Axolotl Companion. See the root [README](../README.md) and
[plan.md](../plan.md) for the full architecture.

## Local development (without Docker)

```bash
uv sync --all-extras
uv run uvicorn axolotl.main:app --reload --port 8001
```

See [../Makefile](../Makefile) for the Compose-based workflow.
