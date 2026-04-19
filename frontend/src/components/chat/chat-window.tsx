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
  sessionId: string;
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
      <div
        ref={scrollRef}
        className="relative flex-1 overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent_0,black_32px,black_calc(100%-32px),transparent_100%)]"
      >
        <div className="mx-auto max-w-3xl space-y-4 p-4">
          {visible.length === 0 && !chat.streaming && (
            <div className="mx-auto flex h-[40vh] max-w-sm flex-col items-center justify-center gap-2 text-center">
              <span aria-hidden className="font-display text-4xl">🪷</span>
              <p className="font-display text-lg font-semibold">Say hi to your axolotl.</p>
              <p className="text-sm text-muted-foreground">
                Ask a question, drop a link, or just think out loud. I&apos;ll keep up.
              </p>
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
              elapsedMs={chat.streaming.elapsedMs}
              reasoningElapsedMs={chat.streaming.reasoningElapsedMs}
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
