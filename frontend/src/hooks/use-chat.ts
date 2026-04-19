"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { API_BASE } from "@/lib/utils";
import { useChatStatus } from "@/stores/chat-status";
import type {
  MessageDoneData,
  MessagePublic,
  MessageTimings,
  SSEEventType,
  ToolCall,
  ToolCallEventData,
  ToolResultEventData,
} from "@/types/api";

export type StreamingToolCall = {
  name: string;
  arguments: unknown;
  result?: unknown;
  duration_ms?: number;
};

type StreamingAssistant = {
  reasoning: string;
  content: string;
  toolCalls: Record<string, StreamingToolCall>;
  done: boolean;
  startedAt: number;
  elapsedMs: number;
  reasoningStartedAt: number | null;
  reasoningElapsedMs: number;
};

export interface UseChatResult {
  messages: MessagePublic[];
  setMessages: React.Dispatch<React.SetStateAction<MessagePublic[]>>;
  streaming: StreamingAssistant | null;
  isSending: boolean;
  error: string | null;
  send: (content: string) => Promise<void>;
  regenerate: () => Promise<void>;
  stop: () => void;
}

/**
 * Opens a fetch-based SSE stream to ``POST /v1/sessions/{id}/messages`` and
 * parses the chat event stream into React state.
 */
export function useChat(
  sessionId: string,
  token: string | null,
  initialMessages: MessagePublic[] = [],
): UseChatResult {
  const [messages, setMessages] = useState<MessagePublic[]>(initialMessages);
  const [streaming, setStreaming] = useState<StreamingAssistant | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const lastUserMessageRef = useRef<string | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mirror the local isSending + rough tokens/s into the global chat-status
  // store so non-chat surfaces (terminal footer, ambient indicators) can react.
  const setStoreSending = useChatStatus((s) => s.setIsSending);
  const setStoreTps = useChatStatus((s) => s.setTokensPerSec);
  useEffect(() => {
    setStoreSending(isSending);
    if (!isSending) setStoreTps(null);
  }, [isSending, setStoreSending, setStoreTps]);
  useEffect(() => {
    if (!streaming || streaming.elapsedMs < 400) return;
    const chars = streaming.content.length + streaming.reasoning.length;
    if (chars === 0) return;
    // ~4 chars per token is the classic tokenizer rule of thumb
    const tps = chars / 4 / (streaming.elapsedMs / 1000);
    setStoreTps(Math.round(tps));
  }, [streaming, setStoreTps]);

  const stop = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    setIsSending(false);
  }, []);

  const send = useCallback(
    async (content: string) => {
      if (!content.trim() || !token) return;

      lastUserMessageRef.current = content;

      const userMsg: MessagePublic = {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: "user",
        content,
        reasoning: null,
        tool_calls: null,
        tool_call_id: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      const startedAt = Date.now();
      setStreaming({
        reasoning: "",
        content: "",
        toolCalls: {},
        done: false,
        startedAt,
        elapsedMs: 0,
        reasoningStartedAt: null,
        reasoningElapsedMs: 0,
      });
      setError(null);
      setIsSending(true);

      // Tick the elapsed counter every 100ms while streaming
      tickRef.current = setInterval(() => {
        setStreaming((prev) => {
          if (!prev) return prev;
          const now = Date.now();
          const reasoningElapsedMs =
            prev.reasoningStartedAt !== null
              ? now - prev.reasoningStartedAt
              : prev.reasoningElapsedMs;
          return { ...prev, elapsedMs: now - prev.startedAt, reasoningElapsedMs };
        });
      }, 100);

      const ctrl = new AbortController();
      controllerRef.current = ctrl;

      const acc = {
        reasoning: "",
        content: "",
        toolCalls: {} as Record<string, StreamingToolCall>,
      };

      try {
        const res = await fetch(`${API_BASE}/v1/sessions/${sessionId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
          },
          body: JSON.stringify({ content }),
          signal: ctrl.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        let currentEvent: SSEEventType | null = null;
        let currentData = "";

        const commit = () => {
          if (!currentEvent) return;
          let parsed: unknown;
          try {
            parsed = currentData ? JSON.parse(currentData) : null;
          } catch {
            parsed = currentData;
          }
          handleEvent(currentEvent, parsed);
          currentEvent = null;
          currentData = "";
        };

        const handleEvent = (ev: SSEEventType, data: unknown) => {
          if (ev === "reasoning.delta") {
            const d = data as { text: string };
            acc.reasoning += d.text;
            setStreaming((prev) => {
              if (!prev) return prev;
              const reasoningStartedAt =
                prev.reasoningStartedAt ?? Date.now();
              return {
                ...prev,
                reasoning: acc.reasoning,
                reasoningStartedAt,
                reasoningElapsedMs: Date.now() - reasoningStartedAt,
              };
            });
            return;
          }
          if (ev === "message.delta") {
            const d = data as { text: string };
            acc.content += d.text;
            setStreaming((prev) => {
              if (!prev) return prev;
              // Reasoning is now frozen once content starts flowing
              const reasoningStartedAt = null;
              const reasoningElapsedMs =
                prev.reasoningStartedAt !== null
                  ? Date.now() - prev.reasoningStartedAt
                  : prev.reasoningElapsedMs;
              return {
                ...prev,
                content: acc.content,
                reasoningStartedAt,
                reasoningElapsedMs,
              };
            });
            return;
          }
          if (ev === "tool.call") {
            const d = data as ToolCallEventData;
            acc.toolCalls[d.id] = { name: d.name, arguments: d.arguments };
            setStreaming((prev) =>
              prev ? { ...prev, toolCalls: { ...acc.toolCalls } } : prev,
            );
            return;
          }
          if (ev === "tool.result") {
            const d = data as ToolResultEventData;
            const existing = acc.toolCalls[d.id] ?? { name: "", arguments: null };
            acc.toolCalls[d.id] = {
              ...existing,
              result: d.result,
              duration_ms: d.duration_ms,
            };
            setStreaming((prev) =>
              prev ? { ...prev, toolCalls: { ...acc.toolCalls } } : prev,
            );
            return;
          }
          if (ev === "message.done") {
            const d = data as MessageDoneData;
            const toolCallsList: ToolCall[] | null =
              Object.keys(acc.toolCalls).length > 0
                ? Object.entries(acc.toolCalls).map(([id, tc]) => ({
                    id,
                    type: "function" as const,
                    function: {
                      name: tc.name,
                      arguments: JSON.stringify(tc.arguments),
                    },
                    result: tc.result,
                    duration_ms: tc.duration_ms,
                  }))
                : null;

            const metadata: MessagePublic["metadata"] = d.timings
              ? { timings: d.timings as MessageTimings }
              : null;

            const finalAssistant: MessagePublic = {
              id: d.message_id,
              role: "assistant",
              content: acc.content || null,
              reasoning: acc.reasoning || null,
              tool_calls: toolCallsList,
              tool_call_id: null,
              created_at: new Date().toISOString(),
              metadata,
            };
            setMessages((m) => {
              if (m.some((x) => x.id === finalAssistant.id)) return m;
              return [...m, finalAssistant];
            });
            if (tickRef.current) {
              clearInterval(tickRef.current);
              tickRef.current = null;
            }
            setStreaming(null);
            return;
          }
          if (ev === "error") {
            const d = data as { message: string };
            setError(d.message);
            setStreaming(null);
          }
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, idx).replace(/\r$/, "");
            buffer = buffer.slice(idx + 1);

            if (line === "") {
              commit();
              continue;
            }
            if (line.startsWith(":")) continue;
            if (line.startsWith("event:")) {
              currentEvent = line.slice(6).trim() as SSEEventType;
            } else if (line.startsWith("data:")) {
              currentData += line.slice(5).trim();
            }
          }
        }
        commit();
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== "AbortError") {
          setError((err as Error).message);
        }
      } finally {
        if (tickRef.current) {
          clearInterval(tickRef.current);
          tickRef.current = null;
        }
        setIsSending(false);
        setStreaming(null);
        controllerRef.current = null;
      }
    },
    [sessionId, token],
  );

  const regenerate = useCallback(async () => {
    const last = lastUserMessageRef.current;
    if (!last) return;
    setMessages((m) => {
      const lastAssistantIdx = [...m].reverse().findIndex((x) => x.role === "assistant");
      if (lastAssistantIdx === -1) return m;
      const realIdx = m.length - 1 - lastAssistantIdx;
      return m.slice(0, realIdx);
    });
    await send(last);
  }, [send]);

  return { messages, setMessages, streaming, isSending, error, send, regenerate, stop };
}
