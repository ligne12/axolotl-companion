# Model configuration

The LLM is fully configurable via environment variables. This page documents an
example configuration, lists models worth knowing in 2026, and explains each
trade-off so you can adapt to your own GPU and usage profile.

> **Architectural baseline.** The project was developed against the
> **Qwen3.5 architecture** — hybrid reasoning mode (`<think>…</think>`
> with a `thinking` toggle), `qwen3_coder` tool-call format, gated
> DeltaNet + MoE. Anything Qwen3.5- or Qwen3.6-compatible drops in
> with a single ``VLLM_MODEL=…`` swap. Other families (Kimi, DeepSeek,
> Llama, GLM, Mistral) also run, but you'll need to swap the matching
> `--reasoning-parser` / `--tool-call-parser` — see the
> [Tool-calling parsers](#tool-calling-parsers-in-vllm) table.

## Example configuration

A working `.env` for a single 16 GB GPU, two-user household, long
context for RAG and code review.

```env
# Pick any model compatible with the parsers below. The snippet uses a
# Qwen3.5-9B AWQ checkpoint as the smallest sane setup — bump up to
# Qwen3.6-27B (AWQ) or DeepSeek-V3.2 (FP8) on bigger cards.
VLLM_MODEL=/root/.cache/huggingface/hub/models--cyankiwi--Qwen3.5-9B-AWQ-4bit/snapshots/main
VLLM_SERVED_MODEL_NAME=axolotl-llm

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

Put these under the `vllm` service in `compose.yaml` (already wired) or export
them before `make dev`.

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
| `--language-model-only` | Skips the vision encoder for VL-family models you use as text-only. Frees 3-5 GB of VRAM during profiling. Drop the flag to enable vision (see [`plan.md` §7.3](../plan.md)). |
| `--reasoning-parser qwen3` | Extracts `<think>…</think>` content into a separate `reasoning` field in the OpenAI response — enables a proper CoT toggle client-side. |
| `--enable-auto-tool-choice` + `--tool-call-parser qwen3_coder` | Lets the model call tools (`web_search` and friends) with the OpenAI function-calling format, parsed by the Qwen-specific parser. |
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
is limited. The app makes it punch above its weight by combining three
techniques:

1. **Chain-of-thought (`--reasoning-parser qwen3`)** — Qwen3 / Qwen3.5 / Qwen3.6
   support an explicit thinking mode. The model reasons step by step in a
   `<think>…</think>` block before answering. The UI shows it as a collapsible
   block above the reply, toggled per-session.
2. **Tool calling (`--enable-auto-tool-choice` + parser)** — the model can ask
   the backend to run a `web_search`, MCP tool, or any registered built-in,
   receive the results, and cite them.
3. **Prefix caching (`--enable-prefix-caching`)** — in a chat flow where the
   system prompt and conversation history are identical across turns, vLLM
   reuses the cached KV for the shared prefix. Time-to-first-token drops a lot
   on multi-turn chats.

## Memory budget primer

The three knobs you'll tune the most — ``VLLM_MAX_MODEL_LEN``,
``VLLM_MAX_NUM_SEQS``, ``VLLM_GPU_MEMORY_UTILIZATION`` — are all
constrained by the same equation. Knowing the math turns OOMs from
puzzles into arithmetic.

```
KV-cache budget        =  utilisation × VRAM        − weights        − activation reserve
KV per token (fp8)     ≈  attn_layers × kv_heads × head_dim × 2 (K+V) × 1 byte
max_concurrent_tokens  =  KV-cache budget / KV per token
max_concurrent_tokens  ≥  max_model_len × max_num_seqs        ← the guard you actually want
```

Worked example for the shipped 16 GB profile — Qwen3.5-9B AWQ, FP8 KV.
The numbers below come from the [official model
card](https://huggingface.co/Qwen/Qwen3.5-9B): 32 layers in a hybrid
**8 × (3 × Gated DeltaNet → 1 × Gated Attention)** pattern, so only
**8 full-attention layers** carry a KV cache — the Gated DeltaNet
linear-attention layers have constant memory and don't contribute.
Full-attention heads: 16 Q / 4 KV (GQA), head_dim 256.

| Term | Value | Notes |
|---|---|---|
| `VRAM` | 16 GB | Card budget |
| `utilisation` | 0.915 | `VLLM_GPU_MEMORY_UTILIZATION` |
| `weights` | ~5.5 GB | 9 B at AWQ-4bit (Marlin) |
| `activation reserve` | ~1.5 GB | Forward-pass scratch + CUDA graph captures |
| → **KV budget** | ~7.6 GB | Everything left for the cache |
| `KV per token (fp8)` | ~16 KB | 8 attn layers × 4 KV heads × 256 head_dim × 2 (K+V) × 1 B |
| → **max_concurrent_tokens** | ~485 K | At fp8 KV |
| `max_model_len × max_num_seqs` | 131 072 × 2 = 262 K | Fits with comfortable headroom |

Swap fp8 → fp16 KV (`VLLM_KV_CACHE_DTYPE=auto`) and `KV per token`
doubles → only ~240 K concurrent tokens fit. At 128 K × 2 sequences
that overflows — drop to 96 K × 2 or accept fp8.

> Hybrid linear-attention models like Qwen3.5 are KV-cheap by design —
> a vanilla dense 9 B with 32 full-attention layers and head_dim 128
> would weigh in around 16 KB/token × 4 (more layers) = ~65 KB/token,
> burning the same KV budget on a quarter of the context. Always
> check the model's architecture before extrapolating.

### Tuning rules of thumb

| Symptom | Knob to move first |
|---|---|
| OOM at boot / warm-up | `gpu_memory_utilization` ↓ by 0.05 |
| OOM on long prompts | `max_model_len` ↓ — or `max_num_batched_tokens` ↓ |
| OOM under concurrent users | `max_num_seqs` ↓ |
| First-token latency too high on big prompts | `max_num_batched_tokens` ↑ (more prefill at once) |
| Decode slows under load | `max_num_seqs` ↓, or model too big — quantise harder |
| KV cache thrashing across long convos | `enable_prefix_caching` on (it is by default in the example) |

### Guards the example `.env` ships with

| Guard | Default | What it actually protects |
|---|---|---|
| `--enable-chunked-prefill` | on | Splits big prefills into chunks — caps activation peak so a 100 K-token prompt doesn't OOM mid-forward |
| `VLLM_MEMORY_PROFILER_ESTIMATE_CUDAGRAPHS=1` | on | Accounts for CUDA-graph captures in the boot-time KV sizing — without this you OOM after 30 s of warm-up |
| `VLLM_KV_CACHE_DTYPE=fp8` | on | Halves the per-token KV cost; the single biggest lever for fitting long context |
| `--language-model-only` | on | Skips the vision-encoder weights on VL models (frees 3-5 GB) |
| `kv_cache_eviction_events` Prom counter | — | Watch in Grafana — non-zero means context is being recycled mid-conversation |

A good rule of thumb: target **85-92 %** GPU utilisation, leave
**1-2 GB** activation reserve, and keep
`max_model_len × max_num_seqs` ≤ **80 %** of the theoretical
`max_concurrent_tokens` so spikes don't tip you over.

## Adapting to your hardware

### Less VRAM (e.g. 8 GB)

- Use a smaller model (3-4B quantized) or heavier quantization (AWQ-4bit, GPTQ-4bit)
- `VLLM_MAX_MODEL_LEN=16384`
- `VLLM_MAX_NUM_SEQS=1`
- `VLLM_GPU_MEMORY_UTILIZATION=0.85`
- Add `--enforce-eager` to `VLLM_EXTRA_FLAGS` to disable CUDA graphs (saves ~1 GB, costs ~5-10% perf)

### More VRAM (e.g. 24 GB — RTX 3090 / 4090 / 5090)

Sized to actually fit after AWQ weights + 32-64 K context KV cache +
activation peak. Coherent candidates:

- `Qwen/Qwen3.6-27B` (AWQ-4bit) — ~14 GB weights, room for 64 K × 2 seqs
- `Qwen/Qwen3.5-32B` (AWQ-4bit) — ~17 GB weights, tighter context budget
- `mistralai/Mistral-Small-3.2-24B-Instruct` (AWQ or FP8)
- `google/gemma-3-27B-it` (AWQ-4bit) — recent Gemma family
- `deepseek-ai/DeepSeek-R1-Distill-Qwen-32B` (AWQ-4bit) — reasoning-tuned

Bigger `VLLM_MAX_NUM_SEQS` (4–8 for small households, higher for
serving). Switch `VLLM_KV_CACHE_DTYPE` to `auto` (fp16) for max
quality only if you still have headroom after the math in
[Memory budget primer](#memory-budget-primer) below.

### Even more (48 GB — A6000 / dual 24 GB)

Mid-tier MoEs start fitting once quantised aggressively:

- `meta-llama/Llama-4-Scout-17B-16E-Instruct` (FP8) — ~55 GB weights,
  needs tensor-parallel across both GPUs; AWQ-4bit (~55 GB) similar.
  Worth the squeeze for the 10 M context window.
- `google/gemma-4-26B-it` (AWQ-4bit) — ~13 GB weights, generous KV
  budget at 256 K context.

True frontier flagships (`Llama-4-Maverick` 400 B, `Mistral-Large-3`
675 B, `DeepSeek-V4-Pro` 1.6 T, `Kimi-K2.6` 1 T, `GLM-5.1` 754 B)
need multi-GPU server-class hardware even at FP8 / NVFP4 — not
realistic on a single workstation card.

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

The list below focuses on **current flagship families (May 2026) with
native tool-calling support** — essential for this project since the companion
uses `web_search`, MCP servers, and other tools. Thinking / chain-of-thought
support is noted where available.

### By VRAM tier

| VRAM | Suggestion | Notes |
|---|---|---|
| 8 GB | `Qwen/Qwen3.6-4B` (AWQ community) | Hybrid reasoning, tool calling, 256K context |
| 8 GB | `microsoft/Phi-4-mini-instruct` | Tool calling, strong reasoning for size |
| 8 GB | `meta-llama/Llama-4-Scout-8B` (AWQ) | Tool calling, 256K context |
| 8 GB | `google/gemma-4-9b-it` (AWQ) | Tool calling, fast decode |
| 8 GB | `Qwen/Qwen3.5-4B` | Hybrid reasoning + tool calling, 262 K context |
| 8 GB | `microsoft/Phi-4-mini-instruct` (3.8 B) | OpenAI-style tool calling, strong reasoning for size |
| 8 GB | `google/gemma-4-E4B-it` | Effective-4 B, reasoning toggle, 256 K context |
| 8 GB | `meta-llama/Llama-3.2-3B-Instruct` (AWQ) | Tool calling, 128 K context |
| 12 GB | `Qwen/Qwen3.5-9B` (AWQ) | Baseline used during development — hybrid reasoning + tool calling, 262 K context |
| 12 GB | `mistralai/Ministral-8B-Instruct-2410` | Sliding-window attention, 128 K context, tool calling |
| 16 GB | `Qwen/Qwen3.5-9B` (FP8) | Baseline at full FP8 quality |
| 16 GB | `microsoft/Phi-4` (AWQ, 14.7 B) | Strong logic / code, 16 K context |
| 16 GB | `microsoft/Phi-4-reasoning` (AWQ, 14 B) | Reasoning-tuned, outperforms DeepSeek-R1 distill 70 B at this size |
| 24 GB | `Qwen/Qwen3.6-27B` (AWQ) | 27 B dense, 262 K context, hybrid multimodal — best 24 GB tier |
| 24 GB | `google/gemma-3-27b-it` (AWQ) | Dense, 128 K context, multimodal, 140 + languages |
| 24 GB | `google/gemma-4-31B-it` (AWQ) | Dense, 256 K context, reasoning toggle, multimodal |
| 24 GB | `mistralai/Mistral-Small-3.2-24B-Instruct-2506` (AWQ / FP8) | Tool calling, reliable JSON, Apache-2.0 |
| 24 GB | `deepseek-ai/DeepSeek-R1-Distill-Qwen-32B` (AWQ) | Reasoning-tuned distillation, fits with FP8 KV |
| 48 GB | `meta-llama/Llama-4-Scout-17B-16E-Instruct` (FP8) | 17 B active / 109 B total / 16 experts, **10 M** context window |
| 48 GB | `google/gemma-4-26B-it` (AWQ, MoE) | 26 B MoE, reasoning toggle, multimodal |
| 80 GB (H100) | `meta-llama/Llama-4-Maverick-17B-128E-Instruct` (AWQ) | 17 B active / 400 B total / 128 experts — needs ≥ 80 GB at AWQ-4bit |
| 80 GB (H100) | `deepseek-ai/DeepSeek-V3.2-Exp` (FP8) | 671 B / 37 B active, 128 K context, DSA sparse attention — **multi-GPU at FP8** |
| Multi-GPU | `mistralai/Mistral-Large-3-675B-Instruct-2512` (NVFP4) | 675 B / 41 B active, 256 K context — needs ≥ 4× 80 GB |
| Multi-GPU | `deepseek-ai/DeepSeek-V4-Flash` (FP8) | 284 B / 13 B active, 1 M context, hybrid CSA + HCA attention |
| Multi-GPU | `deepseek-ai/DeepSeek-V4-Pro` (FP8) | 1.6 T / 49 B active, 1 M context — current open SOTA on coding |
| Multi-GPU | `moonshotai/Kimi-K2.6` (FP8) | 1 T / 32 B active, 256 K context, MLA, 300-agent swarm |
| Multi-GPU | `zai-org/GLM-5.1` (FP8) | 754 B / 44 B active, 200 K context, agentic reasoning |

### Frontier families worth knowing (May 2026)

Release dates verified against the official model cards / changelogs
linked in [Sources](#sources) at the bottom of this page.

- **Qwen3.5 / 3.6** *(Alibaba)* — hybrid Gated DeltaNet + Gated Attention
  architecture, sparse MoE FFNs, hybrid reasoning (`<think>…</think>`
  with `enable_thinking` toggle), 262 K native context (1 M with YaRN).
  Qwen3.5 family released June 2025 (the `35B-A3B` MoE in March 2026);
  **Qwen3.6-27B** dense released April 22, 2026 — current best 24 GB
  tier, hybrid multimodal (text/image/video), Apache-2.0.
- **DeepSeek V4** *(DeepSeek, April 24, 2026)* — two variants:
  **V4-Pro** at 1.6 T total / 49 B active, **V4-Flash** at 284 B /
  13 B active. Both use a hybrid attention combining Compressed
  Sparse Attention (CSA) + Heavily Compressed Attention (HCA), 1 M
  context, and need only 10 % of V3.2's KV cache at 1 M tokens.
  Open weights on HuggingFace, MIT.
- **DeepSeek V3.2-Exp** *(DeepSeek, September 29, 2025)* — 671 B
  total / 37 B active, MoE, 128 K context, introduces DeepSeek Sparse
  Attention (DSA). The fully-frontier 2025 sibling — now overtaken
  by V4 but still widely deployed.
- **Kimi K2.6** *(Moonshot, April 20, 2026)* — 1 T total / 32 B active
  MoE (384 experts, 8 activated), 61 layers with **MLA** attention,
  256 K context. Built for long-horizon agentic flows: 12-hour
  autonomous sessions, **up to 300 sub-agents** coordinating ~4 000
  steps in a single swarm. Modified MIT licence.
- **GLM-5 / GLM-5.1** *(Z.AI / Zhipu, March-April 2026)* — GLM-5 at
  ~745 B / 44 B active MoE (256 experts, 8 activated); GLM-5.1 at
  754 B / 200 K context, MIT licence. Tuned for agentic reasoning
  over thousands of tool calls per session.
- **Llama 4** *(Meta, April 5, 2025)* — Scout at 17 B active / 109 B
  total / 16 experts with a **10 M token** context window (the first
  open model at that scale); Maverick at 17 B active / 400 B total /
  128 experts. iRoPE architecture (interleaved attention without
  positional embeddings on alternating layers). Llama 4 community
  licence.
- **Mistral Large 3** *(Mistral, December 2025)* — `Mistral-Large-3-
  675B-Instruct-2512`, 675 B total / 41 B active MoE, 256 K context.
- **Mistral Small 3.2** *(Mistral, June 20, 2025)* — `Mistral-Small-
  3.2-24B-Instruct-2506`, dense 24 B, 128 K context, Apache-2.0.
- **Gemma 4** *(Google, April 2, 2026)* — open family: E2B, E4B,
  **26 B MoE** and **31 B Dense** sizes (no 27 B in Gemma 4 — the
  27 B is the dense Gemma-3 flagship from March 2025). 256 K context,
  configurable thinking mode, multimodal text + image (audio on
  smaller variants). Apache-2.0.
- **Phi-4** *(Microsoft)* — `phi-4` dense 14.7 B, 16 K context;
  `Phi-4-mini-instruct` 3.8 B; `Phi-4-reasoning` 14 B; `Phi-4-
  multimodal-instruct` (lightweight) at 128 K context. Tool calling
  via standard OpenAI format.

### Tool-calling parsers in vLLM

Add the right parser to `VLLM_EXTRA_FLAGS` depending on the family.
The parser names below are the ones currently shipped in
`vllm/tool_parsers/` (verified against the
[directory listing](https://github.com/vllm-project/vllm/tree/main/vllm/tool_parsers)).

| Family | vLLM flag |
|---|---|
| Qwen3 / Qwen3.5 / Qwen3.6 | `--reasoning-parser qwen3 --tool-call-parser qwen3_xml` (newer) or `qwen3_coder` |
| Kimi K2 / K2.5 / K2.6 | `--tool-call-parser kimi_k2` |
| Llama 3.x | `--tool-call-parser llama3_json` |
| Llama 4 (Scout / Maverick) | `--tool-call-parser llama4_pythonic` |
| Mistral Nemo / Small / Large | `--tool-call-parser mistral` |
| DeepSeek V3 / V3.2 / V4 / R1 | `--tool-call-parser deepseekv3` (or `deepseek_v32` for V3.2-Exp tuning) |
| GLM-4 / GLM-5 / GLM-5.1 | `--tool-call-parser glm4_moe` |
| Gemma 4 | `--tool-call-parser gemma4` |
| Hermes 3 | `--tool-call-parser hermes` |
| Granite | `--tool-call-parser granite` (or `granite-20b-fc`) |
| InternLM 2 | `--tool-call-parser internlm` |
| Hunyuan | `--tool-call-parser hunyuan` |
| Phi-4 | standard OpenAI format — `--enable-auto-tool-choice` alone |

### Quantization formats — quick recap

- **AWQ** (4-bit) — widest compat, Marlin kernel for fast decode
- **GPTQ** (4-bit) — alternative to AWQ, similar quality
- **NVFP4** (4-bit FP) — native on Blackwell (RTX 50xx / B100), 2× throughput vs FP8
- **FP8** (e4m3) — native on Hopper / Blackwell, ~99 % of FP16 quality
- **BF16** — full quality, use when VRAM allows

Always check the model's licence before using it in a self-hosted
setup. Quick recap of the families above: Qwen3.5 / 3.6, DeepSeek
V3.2 / V4, Mistral Small 3.2, Gemma 4, Phi-4 → **Apache-2.0** or **MIT**
(commercial-friendly). Llama 4 ships under the **Llama 4 Community
Licence** (commercial OK but with usage restrictions). Kimi K2.6 →
**Modified MIT**. GLM-5 / GLM-5.1 → **MIT**.

## Sources

Facts in the sections above were cross-checked against these primary
sources in May 2026. The model cards on HuggingFace are authoritative
for architecture / context / licence; release-date and
benchmark claims are linked to first-party or reputable secondary
write-ups.

- [Qwen/Qwen3.5-9B model card](https://huggingface.co/Qwen/Qwen3.5-9B) — architecture (32 layers, hybrid 8 × (3 × Gated DeltaNet → 1 × Gated Attention), 16 Q / 4 KV heads, head_dim 256), 262 K context, Apache-2.0
- [Qwen/Qwen3.6-27B model card](https://huggingface.co/Qwen/Qwen3.6-27B) — released April 22, 2026, 27 B dense, 262 K context, multimodal
- [Qwen 3.5 deep-dive (Trilogy AI)](https://trilogyai.substack.com/p/deep-dive-qwen-35-brings-native-multimodality)
- [DeepSeek V4 announcement (DeepSeek API docs)](https://api-docs.deepseek.com/news/news260424) — V4-Pro 1.6 T / 49 B, V4-Flash 284 B / 13 B, hybrid CSA + HCA
- [DeepSeek V3.2-Exp model card](https://huggingface.co/deepseek-ai/DeepSeek-V3.2-Exp) — 671 B / 37 B active, 128 K context, DSA
- [Kimi K2.6 model card](https://huggingface.co/moonshotai/Kimi-K2.6) — 1 T / 32 B active, 384 experts / 8 activated, MLA, 256 K, Modified MIT
- [Moonshot K2.6 release brief (MarkTechPost)](https://www.marktechpost.com/2026/04/20/moonshot-ai-releases-kimi-k2-6-with-long-horizon-coding-agent-swarm-scaling-to-300-sub-agents-and-4000-coordinated-steps/) — 300-agent swarm, 4 000-step coordinated runs
- [GLM-5 model card](https://huggingface.co/zai-org/GLM-5) — 745 B / 44 B active, 256 experts
- [GLM-5.1 model card](https://huggingface.co/zai-org/GLM-5.1) — 754 B, 200 K context, MIT
- [Llama 4 Scout model card](https://huggingface.co/meta-llama/Llama-4-Scout-17B-16E) — 17 B active / 109 B / 16 experts / 10 M context
- [Llama 4 Maverick model card](https://huggingface.co/meta-llama/Llama-4-Maverick-17B-128E-Instruct) — 17 B active / 400 B / 128 experts
- [Mistral Large 3 model card](https://huggingface.co/mistralai/Mistral-Large-3-675B-Instruct-2512) — 675 B / 41 B active, 256 K, December 2025
- [Mistral Small 3.2 model card](https://huggingface.co/mistralai/Mistral-Small-3.2-24B-Instruct-2506) — 24 B dense, June 20, 2025
- [Ministral 8B Instruct model card](https://huggingface.co/mistralai/Ministral-8B-Instruct-2410) — 8 B, sliding-window attention, 128 K
- [Phi-4 model card](https://huggingface.co/microsoft/phi-4) — 14.7 B dense, 16 K context
- [Phi-4-reasoning model card](https://huggingface.co/microsoft/Phi-4-reasoning) — 14 B reasoning-tuned
- [Gemma 4 release blog (HuggingFace blog)](https://huggingface.co/blog/gemma3) and [Gemma-4 31B-it model card](https://huggingface.co/google/gemma-4-31B-it) — released April 2, 2026; sizes E2B / E4B / 26B MoE / 31B Dense
- [Gemma 3 27B model card](https://huggingface.co/google/gemma-3-27b-it) — March 12, 2025
- [vLLM tool-call parsers directory](https://github.com/vllm-project/vllm/tree/main/vllm/tool_parsers) — canonical list of `--tool-call-parser` values
- [vLLM tool calling docs](https://docs.vllm.ai/en/latest/features/tool_calling/) — usage + matrix
- [vLLM DeepSeek-V3.2 recipe](https://docs.vllm.ai/projects/recipes/en/latest/DeepSeek/DeepSeek-V3_2.html) — `--tool-call-parser deepseekv3`
