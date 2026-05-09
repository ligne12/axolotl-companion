/**
 * Domain types for the axolotl API.
 *
 * Primitive request/response shapes come straight from the auto-generated
 * ``api-generated.ts`` (itself produced by ``make gen-api-types`` on the
 * backend's OpenAPI schema). This file layers a small amount of domain
 * refinement on top:
 *
 *  - ``ToolCall`` / ``MessageTimings`` / ``MessageMetadata`` narrow the
 *    backend's permissive ``dict[str, Any]`` JSON blobs to the shapes we
 *    actually encode/decode.
 *  - ``MessagePublic`` keeps the same field list as the generated type but
 *    reuses our refined ``ToolCall`` and ``MessageMetadata`` types.
 *  - ``SSEEvent*`` types describe the streaming chat protocol, which isn't
 *    part of OpenAPI.
 *
 * Anything not explicitly re-exported / refined here can be pulled via
 * ``import type { components } from "./api-generated"`` then
 * ``components["schemas"]["Foo"]``.
 */

import type { components } from "./api-generated";

// -----------------------------------------------------------------------------
// Straight re-exports from the generated schemas
// -----------------------------------------------------------------------------
export type UserPublic = components["schemas"]["UserPublic"];
export type TokenPair = components["schemas"]["TokenPair"];
export type SessionPublic = components["schemas"]["SessionPublic"];
export type SessionCreate = components["schemas"]["SessionCreate"];
export type SessionUpdate = components["schemas"]["SessionUpdate"];
export type ToolInfo = components["schemas"]["ToolInfo"];
export type RuntimeConfig = components["schemas"]["RuntimeConfig"];
export type PersonaPublic = components["schemas"]["PersonaPublic"];
export type PersonaCreate = components["schemas"]["PersonaCreate"];
export type PersonaUpdate = components["schemas"]["PersonaUpdate"];
export type HyperParams = components["schemas"]["HyperParams"];
export type MCPServerPublic = components["schemas"]["MCPServerPublic"];
export type MCPServerCreate = components["schemas"]["MCPServerCreate"];
export type MCPServerUpdate = components["schemas"]["MCPServerUpdate"];
export type MCPSyncResult = components["schemas"]["MCPSyncResult"];
export type MCPToolInfo = components["schemas"]["MCPToolInfo"];

// -----------------------------------------------------------------------------
// Domain-refined types — OpenAPI sees these as ``dict[str, Any]`` / raw JSON
// blobs; we know the actual shape and prefer the stricter typing client-side.
// -----------------------------------------------------------------------------
export type MessageRole = "user" | "assistant" | "tool" | "system";

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
  /** Result merged client-side from the accompanying tool.result events. */
  result?: unknown;
  /** Execution duration in milliseconds (from the backend tool runner). */
  duration_ms?: number;
}

export interface MessageTimings {
  total_ms?: number;
  round_ms?: number;
  reasoning_ms?: number | null;
  content_ms?: number | null;
  tools_ms?: Record<string, number> | null;
}

export interface MessageMetadata {
  timings?: MessageTimings;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  [key: string]: unknown;
}

/**
 * Same shape as ``components["schemas"]["MessagePublic"]`` but with the
 * refined ``ToolCall`` and ``MessageMetadata`` types instead of the loose
 * JSON blobs OpenAPI reports.
 */
export interface MessagePublic {
  id: string; // UUID
  role: MessageRole;
  content: string | null;
  reasoning: string | null;
  tool_calls: ToolCall[] | null;
  tool_call_id: string | null;
  created_at: string;
  metadata?: MessageMetadata | null;
}

export interface SessionDetail extends SessionPublic {
  messages: MessagePublic[];
}

// -----------------------------------------------------------------------------
// SSE chat stream — protocol lives outside OpenAPI, described by hand
// -----------------------------------------------------------------------------
export type SSEEventType =
  | "message.start"
  | "reasoning.delta"
  | "message.delta"
  | "tool.call"
  | "tool.result"
  | "message.done"
  | "error";

export interface SSEEvent<T = unknown> {
  event: SSEEventType;
  data: T;
}

export interface ToolCallEventData {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResultEventData {
  id: string;
  result: unknown;
  duration_ms?: number;
}

export interface MessageDoneData {
  message_id: string; // UUID
  finish_reason: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
  timings?: MessageTimings;
}
