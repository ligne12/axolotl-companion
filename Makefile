# =============================================================================
# Axolotl Companion — Makefile
# =============================================================================

.DEFAULT_GOAL := help
.PHONY: help dev prod stop down clean logs test lint fmt backend-shell db-migrate db-reset backup obs openapi-export gen-api-types check-api-types

# -----------------------------------------------------------------------------
COMPOSE := docker compose
COMPOSE_PROD := $(COMPOSE) -f compose.yaml -f compose.prod.yaml

# -----------------------------------------------------------------------------
help: ## Show this help
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# -----------------------------------------------------------------------------
# Stack management
# -----------------------------------------------------------------------------
dev: ## Start the full stack in dev mode (HMR)
	$(COMPOSE) up -d --build
	@echo ""
	@echo "  Frontend: https://chat.localhost"
	@echo "  API:      https://api.localhost"
	@echo "  Logs:     make logs"

prod: ## Start the stack in prod mode
	$(COMPOSE_PROD) up -d --build

stop: ## Stop containers (keep volumes)
	$(COMPOSE) stop

down: ## Stop and remove containers (keep volumes)
	$(COMPOSE) down

clean: ## Stop + remove containers AND volumes (destroys data)
	$(COMPOSE) down -v --remove-orphans

logs: ## Tail logs (all services)
	$(COMPOSE) logs -f --tail=100

logs-backend: ## Tail backend logs only
	$(COMPOSE) logs -f backend

logs-vllm: ## Tail vLLM logs only
	$(COMPOSE) logs -f vllm

status: ## Show container status
	$(COMPOSE) ps

# -----------------------------------------------------------------------------
# Observability (Prometheus + Grafana)
# -----------------------------------------------------------------------------
obs: ## Start stack + observability stack
	$(COMPOSE) --profile obs up -d

# -----------------------------------------------------------------------------
# Quality
# -----------------------------------------------------------------------------
test: test-backend test-frontend ## Run all tests

test-backend:
	$(COMPOSE) exec backend pytest -v

test-frontend:
	$(COMPOSE) exec frontend pnpm test

test-e2e: ## Run Playwright e2e tests
	$(COMPOSE) exec frontend pnpm test:e2e

lint: lint-backend lint-frontend ## Lint all

lint-backend:
	$(COMPOSE) exec backend ruff check src tests
	$(COMPOSE) exec backend mypy src

lint-frontend:
	$(COMPOSE) exec frontend pnpm lint
	$(COMPOSE) exec frontend pnpm type-check

fmt: ## Format all code
	$(COMPOSE) exec backend ruff format src tests
	$(COMPOSE) exec frontend pnpm format

# -----------------------------------------------------------------------------
# Backend helpers
# -----------------------------------------------------------------------------
backend-shell: ## Open a shell in the backend container
	$(COMPOSE) exec backend bash

db-shell: ## Open a psql shell
	$(COMPOSE) exec postgres psql -U $${POSTGRES_USER:-axolotl} -d $${POSTGRES_DB:-axolotl}

db-migrate: ## Run Alembic migrations
	$(COMPOSE) exec backend alembic upgrade head

db-makemigration: ## Generate a new Alembic migration (MSG="...")
	$(COMPOSE) exec backend alembic revision --autogenerate -m "$(MSG)"

db-stamp-head: ## Mark current DB as being at latest migration (no SQL run)
	$(COMPOSE) exec backend alembic stamp head

db-reset: ## Drop + recreate DB (destructive!)
	$(COMPOSE) exec postgres dropdb -U $${POSTGRES_USER:-axolotl} $${POSTGRES_DB:-axolotl}
	$(COMPOSE) exec postgres createdb -U $${POSTGRES_USER:-axolotl} $${POSTGRES_DB:-axolotl}
	$(MAKE) db-migrate

# -----------------------------------------------------------------------------
# Data management
# -----------------------------------------------------------------------------
backup: ## Dump postgres DB to ./backups/
	@mkdir -p backups
	$(COMPOSE) exec -T postgres pg_dump -U $${POSTGRES_USER:-axolotl} $${POSTGRES_DB:-axolotl} | gzip > backups/$$(date +%Y-%m-%d_%Hh%M).sql.gz
	@echo "  Backup created: backups/$$(date +%Y-%m-%d_%Hh%M).sql.gz"

restore: ## Restore postgres from latest backup
	@LATEST=$$(ls -t backups/*.sql.gz | head -n1); \
	echo "Restoring from $$LATEST..."; \
	gunzip -c $$LATEST | $(COMPOSE) exec -T postgres psql -U $${POSTGRES_USER:-axolotl} $${POSTGRES_DB:-axolotl}

# -----------------------------------------------------------------------------
# Tooling setup
# -----------------------------------------------------------------------------
install-hooks: ## Install pre-commit hooks (pre-commit + commit-msg)
	pre-commit install --install-hooks
	pre-commit install --hook-type commit-msg

# -----------------------------------------------------------------------------
# OpenAPI → TS types
# -----------------------------------------------------------------------------
openapi-export: ## Dump backend OpenAPI schema to backend/openapi.json
	$(COMPOSE) exec -T backend python scripts/export_openapi.py > backend/openapi.json
	@echo "  → backend/openapi.json"

gen-api-types: openapi-export ## Regenerate frontend TS types from OpenAPI
	$(COMPOSE) exec -T frontend pnpm gen:api-types
	@echo "  → frontend/src/types/api-generated.ts"

check-api-types: ## Fail if frontend types drift from backend OpenAPI (CI)
	$(MAKE) gen-api-types
	@git diff --exit-code backend/openapi.json frontend/src/types/api-generated.ts \
		|| (echo "  ✗ API types are out of sync. Run 'make gen-api-types' and commit."; exit 1)
