"use client";

import { Check, Copy, RotateCw } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import type { StreamingToolCall } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";
import type { MessagePublic, ToolCall } from "@/types/api";

type SearchResult = {
  url: string;
  title: string;
  snippet: string;
  domain?: string;
  icon?: string;
};

function WebSearchResults({
  query,
  results,
}: {
  query: string;
  results: SearchResult[];
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs text-muted-foreground">
        <span className="font-medium">🔍 Web search</span>
        <span className="ml-1.5">“{query}”</span>
        <span className="ml-1.5">· {results.length} result{results.length > 1 ? "s" : ""}</span>
      </div>
      <ul className="space-y-1.5">
        {results.map((r, i) => (
          <li
            key={r.url + i}
            className="rounded-md border border-border/50 bg-background/60 p-2"
          >
            <div className="flex items-start gap-2">
              {r.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.icon}
                  alt=""
                  width={16}
                  height={16}
                  className="mt-0.5 size-4 shrink-0 rounded-sm"
                  loading="lazy"
                />
              ) : (
                <span className="mt-0.5 size-4 shrink-0 rounded-sm bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-xs font-medium text-primary hover:underline"
                  title={r.title}
                >
                  {r.title}
                </a>
                <div className="truncate text-[10px] text-muted-foreground">
                  {r.domain ?? new URL(r.url).hostname}
                </div>
                {r.snippet && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {r.snippet}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function isWebSearchResult(
  result: unknown,
): result is { query: string; results: SearchResult[] } {
  return (
    typeof result === "object" &&
    result !== null &&
    "results" in result &&
    Array.isArray((result as { results: unknown }).results)
  );
}

function ToolCallCard({
  name,
  args,
  result,
}: {
  name: string;
  args: unknown;
  result?: unknown;
}) {
  const isWebSearch = name === "web_search" && result !== undefined && isWebSearchResult(result);

  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5 text-xs">
      {isWebSearch ? (
        <WebSearchResults
          query={(result as { query: string }).query ?? ""}
          results={(result as { results: SearchResult[] }).results}
        />
      ) : (
        <>
          <div className="font-medium">🔧 {name}</div>
          <pre className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">
            {typeof args === "string" ? args : JSON.stringify(args, null, 2)}
          </pre>
          {result !== undefined && (
            <details className="mt-1 border-t pt-1">
              <summary className="cursor-pointer text-muted-foreground">Result</summary>
              <pre className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">
                {JSON.stringify(result, null, 2).slice(0, 1500)}
              </pre>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function Markdown({ text }: { text: string }) {
  return (
    <div className="markdown-body space-y-2 text-sm leading-relaxed [&_a]:underline [&_a]:underline-offset-2 [&_code]:rounded [&_code]:bg-background/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_h1]:mt-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mt-2 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:whitespace-pre-wrap [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-background/60 [&_pre]:p-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-4">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

export function MessageBubble({
  message,
  onRegenerate,
  isLast,
}: {
  message: MessagePublic;
  onRegenerate?: () => void;
  isLast?: boolean;
}) {
  const isUser = message.role === "user";
  const hasReasoning = Boolean(message.reasoning);
  const hasToolCalls = Boolean(message.tool_calls?.length);
  const [copied, setCopied] = useState(false);

  // Don't render stand-alone tool messages — they're aggregated into assistant
  if (message.role === "tool") return null;

  async function copy() {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop
    }
  }

  return (
    <div className={cn("group flex flex-col", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[80%] space-y-2 rounded-2xl px-4 py-2 text-sm shadow-sm",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        {hasReasoning && (
          <details className="rounded-md bg-background/40 p-2 text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none font-medium">Reasoning</summary>
            <pre className="mt-1 whitespace-pre-wrap font-sans text-xs">
              {message.reasoning}
            </pre>
          </details>
        )}
        {hasToolCalls &&
          message.tool_calls!.map((tc: ToolCall) => (
            <ToolCallCard
              key={tc.id}
              name={tc.function.name}
              args={(() => {
                try {
                  return JSON.parse(tc.function.arguments);
                } catch {
                  return tc.function.arguments;
                }
              })()}
              result={tc.result}
            />
          ))}
        {message.content && (
          <div className={cn(isUser && "[&_a]:text-primary-foreground [&_a]:underline")}>
            {isUser ? (
              <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
            ) : (
              <Markdown text={message.content} />
            )}
          </div>
        )}
      </div>

      {message.content && (
        <div className="mt-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={copy}>
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            <span className="ml-1 text-xs">{copied ? "Copied" : "Copy"}</span>
          </Button>
          {isLast && onRegenerate && (
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onRegenerate}>
              <RotateCw className="size-3" />
              <span className="ml-1 text-xs">Regenerate</span>
            </Button>
          )}
        </div>
      )}
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
  toolCalls: Record<string, StreamingToolCall>;
}) {
  const toolList = Object.entries(toolCalls);

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] space-y-2 rounded-2xl bg-muted px-4 py-2 text-sm shadow-sm">
        {reasoning.length > 0 && (
          <details open className="rounded-md bg-background/40 p-2 text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none font-medium">Thinking...</summary>
            <pre className="mt-1 whitespace-pre-wrap font-sans text-xs">{reasoning}</pre>
          </details>
        )}
        {toolList.map(([id, tc]) => (
          <ToolCallCard key={id} name={tc.name} args={tc.arguments} result={tc.result} />
        ))}
        {content && <Markdown text={content} />}
        <span className="inline-block animate-pulse text-xs text-muted-foreground">●</span>
      </div>
    </div>
  );
}
