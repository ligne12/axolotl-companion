/** Manual mirrors of the backend Pydantic schemas. */

export interface UserPublic {
  id: number;
  username: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  access_expires_at: string;
  refresh_expires_at: string;
}

export interface SessionPublic {
  id: number;
  title: string;
  persona_id: number | null;
  model: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export type MessageRole = "user" | "assistant" | "tool" | "system";

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
  /** Result merged client-side from the accompanying tool.result events. */
  result?: unknown;
}

export interface MessagePublic {
  id: string; // UUID
  role: MessageRole;
  content: string | null;
  reasoning: string | null;
  tool_calls: ToolCall[] | null;
  tool_call_id: string | null;
  created_at: string;
}

export interface SessionDetail extends SessionPublic {
  messages: MessagePublic[];
}

export interface ToolInfo {
  name: string;
  title: string;
  description: string;
  category: string;
  icon: string | null;
  enabled: boolean;
}

// --- SSE events --------------------------------------------------------------
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
}

export interface MessageDoneData {
  message_id: string; // UUID
  finish_reason: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
}
