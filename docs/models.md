# Model configuration

The LLM is fully configurable via environment variables. This page documents one
working example and explains each trade-off so you can adapt to your own GPU
and usage profile.

## Example: small model, long context, 2-user household

**Target use case**

- 2 concurrent users at home
- Long context conversations (RAG, long documents, code files)
- A small-to-mid model boosted with tool calling (web search) and chain-of-thought reasoning
- A single 16 GB VRAM GPU (Blackwell SM_120)

**`.env` snippet**

```env
# Model (local snapshot or HF repo id)
VLLM_MODEL=/root/.cache/huggingface/hub/models--cyankiwi--Qwen3.5-9B-AWQ-4bit/snapshots/main
VLLM_SERVED_MODEL_NAME=qwen3.5-9b-awq

# Context & parallelism
VLLM_MAX_MODEL_LEN=131072
VLLM_MAX_NUM_SEQS=2
VLLM_MAX_NUM_BATCHED_TOKENS=4096

# Memory
VLLM_GPU_MEMORY_UTILIZATION=0.915
VLLM_KV_CACHE_DTYPE=fp8
VLLM_BLOCK_SIZE=16

# Quantization is auto-detected from model config (AWQ Marlin here)
VLLM_QUANTIZATION=

# Extra flags — multimodal skip, reasoning, tool calling, caching
VLLM_EXTRA_FLAGS=--language-model-only --reasoning-parser qwen3 --enable-auto-tool-choice --tool-call-parser qwen3_coder --enable-prefix-caching --enable-chunked-prefill
```

**Environment variables for the container**

```env
HF_TOKEN=hf_REPLACE_ME
PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True,max_split_size_mb:128
TORCH_CUDA_ARCH_LIST=12.0+PTX
VLLM_MEMORY_PROFILER_ESTIMATE_CUDAGRAPHS=1
VLLM_USE_FLASHINFER_SAMPLER=1
VLLM_ENABLE_V1_MULTIPROCESSING=1
NCCL_DEBUG=WARN
```

Put these under the `vllm` service in `compose.yaml` (already wired) or export them
before `make dev`.

## Why these values

### Context & parallelism

| Flag | Value | Rationale |
|---|---|---|
| `max-model-len` | 131072 | 128 K context — long RAG / multi-doc / code review. With FP8 KV cache the overhead stays manageable on 16 GB. |
| `max-num-seqs` | 2 | Two concurrent users. Anything higher grows the KV cache budget and risks OOM at 128 K. |
| `max-num-batched-tokens` | 4096 | Conservative value to leave headroom for big prefills on long contexts. Raise to 8192+ if most prompts are short. |

### Memory

| Flag | Value | Rationale |
|---|---|---|
| `gpu-memory-utilization` | 0.915 | Tight but stable on 16 GB after CUDA graph accounting. Drop to 0.88 if you see OOM at boot. |
| `kv-cache-dtype` | fp8 | Halves the KV cache footprint vs fp16 — essential to fit 128 K × 2 sequences. Blackwell has native FP8 tensor cores. |
| `block-size` | 16 | Good default for PagedAttention. Smaller blocks → finer prefix caching. |

### Quality & features

| Flag | Effect |
|---|---|
| `--language-model-only` | Skips the vision encoder for VL-family models you use as text-only. Frees 3-5 GB of VRAM during profiling. |
| `--reasoning-parser qwen3` | Extracts `<think>…</think>` content into a separate `reasoning` field in the OpenAI response — enables a proper CoT toggle client-side. |
| `--enable-auto-tool-choice` + `--tool-call-parser qwen3_coder` | Lets the model call tools (e.g. `web_search`) with the OpenAI function-calling format, parsed by the Qwen-specific parser. |
| `--enable-prefix-caching` | Re-uses the KV cache for prompts that share a common prefix (system prompt, multi-turn chat). Huge latency win. |
| `--enable-chunked-prefill` | Interleaves large prefills with decode steps to keep decoding smooth under load. |

### Env vars

| Variable | Effect |
|---|---|
| `PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True,max_split_size_mb:128` | Reduces fragmentation on long-running workloads. |
| `TORCH_CUDA_ARCH_LIST=12.0+PTX` | Targets Blackwell SM_120 specifically for JIT-compiled kernels. Use `8.9+PTX` for Ada, `8.0+PTX` for Ampere, etc. |
| `VLLM_MEMORY_PROFILER_ESTIMATE_CUDAGRAPHS=1` | Accounts for CUDA graph memory during KV cache sizing — prevents OOM at warm-up. |
| `VLLM_USE_FLASHINFER_SAMPLER=1` | Uses FlashInfer kernels for sampling. Small but measurable speedup. |
| `VLLM_ENABLE_V1_MULTIPROCESSING=1` | Enables the V1 engine multiprocessing path. |
| `NCCL_DEBUG=WARN` | Quiets NCCL spam in logs. |

## How the app amplifies a small model

A 9B-class model is fast and cheap to run locally, but its raw world knowledge
is limited. We make it punch above its weight by combining three techniques:

1. **Chain-of-thought (`--reasoning-parser qwen3`)** — Qwen3 supports an
   explicit thinking mode. The model reasons step by step in a `<think>…</think>`
   block before answering. The UI can show this separately or hide it.
2. **Tool calling (`--enable-auto-tool-choice` + parser)** — the model can ask
   the backend to run a `web_search`, `get_weather`, or `get_datetime` tool,
   receive the results, and cite them.
3. **Prefix caching (`--enable-prefix-caching`)** — in a chat flow where the
   system prompt and conversation history are identical across turns, vLLM
   reuses the cached KV for the shared prefix. Time-to-first-token drops a lot
   on multi-turn chats.

## Adapting to your hardware

### Less VRAM (e.g. 8 GB)

- Use a smaller model (3-4B quantized) or heavier quantization (AWQ-4bit, GPTQ-4bit)
- `VLLM_MAX_MODEL_LEN=16384`
- `VLLM_MAX_NUM_SEQS=1`
- `VLLM_GPU_MEMORY_UTILIZATION=0.85`
- Add `--enforce-eager` to `VLLM_EXTRA_FLAGS` to disable CUDA graphs (saves ~1 GB, costs ~5-10% perf)

### More VRAM (e.g. 24+ GB)

- Use a larger quantized model (Qwen2.5-32B-AWQ, Llama-3.3-70B-Instruct-AWQ)
- Bigger `VLLM_MAX_NUM_SEQS` (4-8 for small households, higher for serving)
- Switch `VLLM_KV_CACHE_DTYPE` to `auto` (fp16) for max quality if memory allows

### Multi-GPU

- Add `--tensor-parallel-size N` to `VLLM_EXTRA_FLAGS`
- Ensure the model has a hidden size divisible by `N`

### Non-Blackwell GPUs

Adjust `TORCH_CUDA_ARCH_LIST`:

| Arch | Value |
|---|---|
| Blackwell (RTX 50xx, B100) | `12.0+PTX` |
| Ada Lovelace (RTX 40xx) | `8.9+PTX` |
| Ampere (RTX 30xx, A100) | `8.0+PTX` |
| Turing (RTX 20xx) | `7.5+PTX` |

You may also need to drop FlashInfer flags if your arch is unsupported; vLLM
auto-falls back to Triton attention.

## Finding a model

Compatible formats: safetensors with a `config.json` (AWQ / GPTQ / NVFP4 / FP8 / BF16).

The list below focuses on **current flagship families (late 2025 → 2026) with
native tool-calling support** — essential for this project since the companion
uses `web_search`, `get_weather`, and other tools. Thinking / chain-of-thought
support is noted where available.

### By VRAM tier

| VRAM | Suggestion | Notes |
|---|---|---|
| 8 GB | `Qwen/Qwen3.5-4B` (AWQ community) | Hybrid reasoning (thinking toggle), tool calling, 262K context |
| 8 GB | `microsoft/Phi-4-mini-instruct` | Tool calling, strong reasoning for size |
| 8 GB | `meta-llama/Llama-3.2-3B-Instruct` | Tool calling, 128K context |
| 12 GB | `Qwen/Qwen3.5-9B` (AWQ) | Hybrid reasoning + tool calling, 262K context |
| 12 GB | `mistralai/Ministral-8B-Instruct-2410` | Tool calling, 128K context |
| 16 GB | `Qwen/Qwen3.5-9B` (FP8) | Same as above with better quality headroom |
| 16 GB | `Qwen/Qwen3.5-27B` (AWQ) | Best mid-tier, hybrid reasoning + tool calling |
| 16 GB | `microsoft/Phi-4` (AWQ, 14B) | Strong logic and code |
| 24 GB | `Qwen/Qwen3.5-27B` (FP8) | Full quality at this tier |
| 24 GB | `Qwen/Qwen3.5-35B-A3B` (AWQ, MoE) | 35B MoE, 3B active per token — fast decode |
| 24 GB | `mistralai/Mistral-Small-3.1-24B-Instruct` (AWQ) | Tool calling, reliable JSON |
| 48 GB | `Qwen/Qwen3.5-122B-A10B` (NVFP4 on Blackwell) | MoE 122B, 10B active — near-frontier at home |
| 48 GB | `meta-llama/Llama-3.3-70B-Instruct` (AWQ) | Tool calling, 128K context |
| 48 GB | `deepseek-ai/DeepSeek-V3.2` (FP8) | Frontier open MoE, tool calling, 128K context |
| 80+ GB | `Qwen/Qwen3.5-397B-A17B` (NVFP4) | Flagship Qwen MoE, best open-source scores on GPQA / IFEval |
| 80+ GB | `moonshotai/Kimi-K2.5` (FP8) | 1T MoE, 32B active, Agent Swarm, leads most agentic benchmarks |

### Frontier families worth knowing

- **Qwen3.5** (Alibaba, 2025-2026) — hybrid architecture (Gated DeltaNet + MoE),
  hybrid reasoning mode (thinking toggle per request), 262K native context.
  Best open-source scores on GPQA Diamond (88.4) and IFEval (92.6).
  Sizes: 4B / 9B / 27B / 35B-A3B / 122B-A10B / 397B-A17B.
- **Kimi K2 / K2.5** (Moonshot AI, 2025-2026) — 1T MoE (32B active), built
  specifically for agentic workloads. K2.5 adds an Agent Swarm paradigm (up to
  100 sub-agents coordinating up to 1500 tool calls). State-of-the-art on
  SWE-bench Verified and most tool-use benchmarks.
- **DeepSeek V3.2 / R1** (DeepSeek, 2025-2026) — 671B MoE (37B active), strong
  reasoning, FP8 native. R1 distillations (8B / 14B) bring meaningful CoT to
  smaller models.
- **Llama 4** (Meta, 2025) — Scout / Maverick variants, instruction-tuned,
  128K context, good general performance under Q4 quantization.
- **Mistral Small 3.1 / Large 3** (Mistral, 2025-2026) — Mistral adopted the
  DeepSeek-like architecture in their latest flagship.
- **Phi-4** (Microsoft, 2025) — 14B, strong for logic / code, tool calling.

### Tool-calling parsers in vLLM

Add the right parser to `VLLM_EXTRA_FLAGS` depending on the family:

| Family | vLLM flag |
|---|---|
| Qwen3.5 / Qwen3 | `--reasoning-parser qwen3 --tool-call-parser qwen3_coder` |
| Kimi K2 / K2.5 | `--tool-call-parser kimi_k2` |
| Llama 3.x, Llama 4 | `--tool-call-parser llama3_json` |
| Mistral Nemo / Small / Large | `--tool-call-parser mistral` |
| Hermes 3 | `--tool-call-parser hermes` |
| Phi-4 | standard OpenAI format (auto-detected) |
| DeepSeek V3 / R1 | `--tool-call-parser deepseek_v3` |

### Quantization formats — quick recap

- **AWQ** (4-bit) — widest compat, Marlin kernel for fast decode
- **GPTQ** (4-bit) — alternative to AWQ, similar quality
- **NVFP4** (4-bit FP) — native on Blackwell (RTX 50xx / B100), 2× throughput vs FP8
- **FP8** (e4m3) — native on Hopper / Blackwell, ~99 % of FP16 quality
- **BF16** — full quality, use when VRAM allows

Always check the model's license before using it in a self-hosted setup
(some Llama-family licences restrict commercial use; Qwen is Apache-2.0).
