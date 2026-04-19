# =============================================================================
# vLLM inference server
# Model and flags are fully configurable via environment variables
# See .env.example for defaults
# =============================================================================

FROM vllm/vllm-openai:nightly

LABEL org.opencontainers.image.source="https://github.com/USER/axolotl-companion"
LABEL org.opencontainers.image.description="vLLM server for Axolotl Companion"
LABEL org.opencontainers.image.licenses="MIT"

# -----------------------------------------------------------------------------
# Defaults — overridable via env / docker-compose
# The model path is REQUIRED (must be mounted via HF cache volume or set to
# a HuggingFace repo id)
# -----------------------------------------------------------------------------
ENV VLLM_MODEL="" \
    VLLM_SERVED_MODEL_NAME="" \
    VLLM_MAX_MODEL_LEN=8192 \
    VLLM_MAX_NUM_SEQS=2 \
    VLLM_GPU_MEMORY_UTILIZATION=0.9 \
    VLLM_MAX_NUM_BATCHED_TOKENS=4096 \
    VLLM_BLOCK_SIZE=16 \
    VLLM_KV_CACHE_DTYPE=auto \
    VLLM_QUANTIZATION="" \
    VLLM_EXTRA_FLAGS=""

# -----------------------------------------------------------------------------
# Entrypoint
# Reads the env and builds the vllm serve command.
# Extra flags can be passed via VLLM_EXTRA_FLAGS for advanced tuning
# (e.g. --enable-prefix-caching, --reasoning-parser, --tool-call-parser,
# --enable-auto-tool-choice, --rope-scaling, etc.)
# -----------------------------------------------------------------------------
ENTRYPOINT ["sh", "-c", "\
  if [ -z \"$VLLM_MODEL\" ]; then \
    echo 'ERROR: VLLM_MODEL must be set (path or HF repo id)'; exit 1; \
  fi; \
  exec vllm serve \"$VLLM_MODEL\" \
    ${VLLM_SERVED_MODEL_NAME:+--served-model-name $VLLM_SERVED_MODEL_NAME} \
    --host 0.0.0.0 \
    --port 8000 \
    --max-model-len $VLLM_MAX_MODEL_LEN \
    --max-num-seqs $VLLM_MAX_NUM_SEQS \
    --gpu-memory-utilization $VLLM_GPU_MEMORY_UTILIZATION \
    --max-num-batched-tokens $VLLM_MAX_NUM_BATCHED_TOKENS \
    --block-size $VLLM_BLOCK_SIZE \
    --kv-cache-dtype $VLLM_KV_CACHE_DTYPE \
    ${VLLM_QUANTIZATION:+--quantization $VLLM_QUANTIZATION} \
    --trust-remote-code \
    $VLLM_EXTRA_FLAGS \
"]
