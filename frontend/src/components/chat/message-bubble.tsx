"use client";

import { cn } from "@/lib/utils";
import type { MessagePublic } from "@/types/api";

export function MessageBubble({ message }: { message: MessagePublic }) {
  const isUser = message.role === "user";
  const hasReasoning = Boolean(message.reasoning);

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] space-y-2 rounded-2xl px-4 py-2 text-sm shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        {hasReasoning && (
          <details className="rounded-md bg-background/40 p-2 text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none font-medium">
              Reasoning
            </summary>
            <pre className="mt-1 whitespace-pre-wrap font-sans">
              {message.reasoning}
            </pre>
          </details>
        )}
        {message.content && (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        )}
      </div>
    </div>
  );
}

export function StreamingBubble({
  reasoning,
  content,
  toolCalls,
}: {
  reasoning: string;
  content: string;
  toolCalls: Record<string, { name: string; arguments: unknown; result?: unknown }>;
}) {
  const showReasoning = reasoning.length > 0;
  const toolList = Object.entries(toolCalls);

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] space-y-2 rounded-2xl bg-muted px-4 py-2 text-sm shadow-sm">
        {showReasoning && (
          <details open className="rounded-md bg-background/40 p-2 text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none font-medium">
              Thinking...
            </summary>
            <pre className="mt-1 whitespace-pre-wrap font-sans">{reasoning}</pre>
          </details>
        )}
        {toolList.map(([id, tc]) => (
          <div
            key={id}
            className="rounded-md border border-primary/30 bg-primary/5 p-2 text-xs"
          >
            <div className="font-medium">🔍 {tc.name}</div>
            <pre className="mt-1 whitespace-pre-wrap text-muted-foreground">
              {JSON.stringify(tc.arguments, null, 2)}
            </pre>
            {tc.result !== undefined && (
              <pre className="mt-1 border-t pt-1 text-muted-foreground">
                {JSON.stringify(tc.result, null, 2).slice(0, 400)}
              </pre>
            )}
          </div>
        ))}
        {content && <p className="whitespace-pre-wrap leading-relaxed">{content}</p>}
        <span className="inline-block animate-pulse text-xs text-muted-foreground">
          ●
        </span>
      </div>
    </div>
  );
}
