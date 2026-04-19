"use client";

import { useEffect, useMemo, useRef } from "react";

import { ChatInput } from "@/components/chat/chat-input";
import { MessageBubble, StreamingBubble } from "@/components/chat/message-bubble";
import { useChat } from "@/hooks/use-chat";
import type { MessagePublic } from "@/types/api";

export function ChatWindow({
  sessionId,
  initialMessages,
  token,
}: {
  sessionId: number;
  initialMessages: MessagePublic[];
  token: string | null;
}) {
  const chat = useChat(sessionId, token, initialMessages);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [chat.messages.length, chat.streaming]);

  // Deduplicate by id (safety net) and hide standalone tool-role messages
  const visible = useMemo(() => {
    const seen = new Set<string>();
    return chat.messages.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      if (m.role === "tool") return false;
      return true;
    });
  }, [chat.messages]);

  const lastAssistantId = useMemo<string | null>(() => {
    for (let i = visible.length - 1; i >= 0; i--) {
      if (visible[i]?.role === "assistant") return visible[i]!.id;
    }
    return null;
  }, [visible]);

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 p-4">
          {visible.length === 0 && !chat.streaming && (
            <div className="flex h-[40vh] items-center justify-center text-center text-muted-foreground">
              Say hi to your axolotl companion.
            </div>
          )}
          {visible.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isLast={m.id === lastAssistantId && !chat.streaming}
              onRegenerate={chat.regenerate}
            />
          ))}
          {chat.streaming && (
            <StreamingBubble
              reasoning={chat.streaming.reasoning}
              content={chat.streaming.content}
              toolCalls={chat.streaming.toolCalls}
            />
          )}
          {chat.error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {chat.error}
            </div>
          )}
        </div>
      </div>
      <ChatInput
        onSend={(c) => void chat.send(c)}
        onStop={chat.stop}
        isSending={chat.isSending}
        disabled={!token}
      />
    </div>
  );
}
