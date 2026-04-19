"use client";

import { useCallback, useRef, useState } from "react";

import { API_BASE } from "@/lib/utils";
import type {
  MessageDoneData,
  MessagePublic,
  SSEEventType,
  ToolCallEventData,
  ToolResultEventData,
} from "@/types/api";

type StreamingAssistant = {
  reasoning: string;
  content: string;
  toolCalls: Record<string, { name: string; arguments: unknown; result?: unknown }>;
  done: boolean;
};

export interface UseChatResult {
  messages: MessagePublic[];
  setMessages: React.Dispatch<React.SetStateAction<MessagePublic[]>>;
  streaming: StreamingAssistant | null;
  isSending: boolean;
  error: string | null;
  send: (content: string) => Promise<void>;
  stop: () => void;
}

/**
 * Opens a fetch-based SSE stream to ``POST /v1/sessions/{id}/messages`` and
 * parses the chat event stream into React state.
 */
export function useChat(sessionId: number, token: string | null): UseChatResult {
  const [messages, setMessages] = useState<MessagePublic[]>([]);
  const [streaming, setStreaming] = useState<StreamingAssistant | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setIsSending(false);
  }, []);

  const send = useCallback(
    async (content: string) => {
      if (!content.trim() || !token) return;

      const userMsg: MessagePublic = {
        id: Date.now(),
        role: "user",
        content,
        reasoning: null,
        tool_calls: null,
        tool_call_id: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      setStreaming({ reasoning: "", content: "", toolCalls: {}, done: false });
      setError(null);
      setIsSending(true);

      const ctrl = new AbortController();
      controllerRef.current = ctrl;

      try {
        const res = await fetch(
          `${API_BASE}/v1/sessions/${sessionId}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              Accept: "text/event-stream",
            },
            body: JSON.stringify({ content }),
            signal: ctrl.signal,
          },
        );

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
          setStreaming((prev) => {
            if (!prev) return prev;
            const next = { ...prev };
            switch (ev) {
              case "reasoning.delta": {
                const d = data as { text: string };
                next.reasoning += d.text;
                break;
              }
              case "message.delta": {
                const d = data as { text: string };
                next.content += d.text;
                break;
              }
              case "tool.call": {
                const d = data as ToolCallEventData;
                next.toolCalls = {
                  ...next.toolCalls,
                  [d.id]: { name: d.name, arguments: d.arguments },
                };
                break;
              }
              case "tool.result": {
                const d = data as ToolResultEventData;
                const existing = next.toolCalls[d.id] ?? {
                  name: "",
                  arguments: null,
                };
                next.toolCalls = {
                  ...next.toolCalls,
                  [d.id]: { ...existing, result: d.result },
                };
                break;
              }
              case "message.done": {
                const d = data as MessageDoneData;
                const finalAssistant: MessagePublic = {
                  id: d.message_id,
                  role: "assistant",
                  content: next.content || null,
                  reasoning: next.reasoning || null,
                  tool_calls: null,
                  tool_call_id: null,
                  created_at: new Date().toISOString(),
                };
                setMessages((m) => [...m, finalAssistant]);
                next.done = true;
                break;
              }
              case "error": {
                const d = data as { message: string };
                setError(d.message);
                next.done = true;
                break;
              }
              default:
                break;
            }
            return next;
          });
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
            if (line.startsWith(":")) continue; // comment
            if (line.startsWith("event:")) {
              currentEvent = line.slice(6).trim() as SSEEventType;
            } else if (line.startsWith("data:")) {
              currentData += line.slice(5).trim();
            }
          }
        }
        commit();
      } catch (err) {
        if ((err as { name?: string }).name !== "AbortError") {
          setError((err as Error).message);
        }
      } finally {
        setIsSending(false);
        setStreaming(null);
        controllerRef.current = null;
      }
    },
    [sessionId, token],
  );

  return { messages, setMessages, streaming, isSending, error, send, stop };
}
