"""Public runtime config for the frontend (model name, version, etc.)."""

from __future__ import annotations

from typing import Annotated

import structlog
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from axolotl import __version__
from axolotl.config import get_settings
from axolotl.llm import VLLMClient, get_llm_client

logger = structlog.get_logger(__name__)
router = APIRouter()


class RuntimeConfig(BaseModel):
    """What the UI status bar needs to render the ambient chrome."""

    version: str
    model: str
    model_source: str  # "vllm" (fetched live) | "config" (env fallback)


@router.get("", response_model=RuntimeConfig)
async def get_runtime_config(
    llm: Annotated[VLLMClient, Depends(get_llm_client)],
) -> RuntimeConfig:
    """Return the current model, version, and where the model name came from.

    The frontend terminal footer reads this to display ``MODEL <name>``.
    We prefer the live vLLM ``/v1/models`` response (source-of-truth for what's
    actually loaded), and fall back to the configured env value if vLLM is
    unreachable so the bar never breaks.
    """
    settings = get_settings()
    configured = settings.vllm_served_model_name

    try:
        models = await llm.list_models()
    except Exception as exc:  # noqa: BLE001 — any network / parse error lands us in fallback
        logger.warning("config.vllm_models_unreachable", error=str(exc))
        return RuntimeConfig(version=__version__, model=configured, model_source="config")

    first = next((m.get("id") for m in models if isinstance(m, dict) and m.get("id")), None)
    if not isinstance(first, str) or not first:
        return RuntimeConfig(version=__version__, model=configured, model_source="config")
    return RuntimeConfig(version=__version__, model=first, model_source="vllm")
