"use client";

import { Check, Copy, RotateCw } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import type { StreamingToolCall } from "@/hooks/use-chat";
import DecryptedText from "@/components/reactbits/decrypted-text";
import { cn, formatDuration } from "@/lib/utils";
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
  durationMs,
}: {
  query: string;
  results: SearchResult[];
  durationMs?: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-display font-semibold uppercase tracking-wider">🔍 Web search</span>
        <span className="truncate text-muted-foreground">“{query}”</span>
        <span className="text-muted-foreground">· {results.length} result{results.length > 1 ? "s" : ""}</span>
        {typeof durationMs === "number" && (
          <span className="ml-auto font-mono tabular-nums text-[10px] text-muted-foreground">
            {formatDuration(durationMs)}
          </span>
        )}
      </div>
      <ul className="space-y-1.5">
        {results.map((r, i) => (
          <li
            key={r.url + i}
            className="rounded-md border-2 border-border bg-card p-2 shadow-[2px_2px_0_0_var(--border)] transition-[transform,box-shadow] duration-100 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_0_var(--lime)]"
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
                  className="block truncate text-xs font-semibold hover:underline"
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
  durationMs,
}: {
  name: string;
  args: unknown;
  result?: unknown;
  durationMs?: number;
}) {
  const isWebSearch = name === "web_search" && result !== undefined && isWebSearchResult(result);

  return (
    <div className="rounded-md border-2 border-border bg-card p-2.5 text-xs shadow-[2px_2px_0_0_var(--border)]">
      {isWebSearch ? (
        <WebSearchResults
          query={(result as { query: string }).query ?? ""}
          results={(result as { results: SearchResult[] }).results}
          durationMs={durationMs}
        />
      ) : (
        <>
          <div className="flex items-center gap-1.5">
            <span className="font-display font-semibold">🔧 {name}</span>
            {typeof durationMs === "number" && (
              <span className="ml-auto font-mono tabular-nums text-[10px] text-muted-foreground">
                {formatDuration(durationMs)}
              </span>
            )}
          </div>
          <pre className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">
            {typeof args === "string" ? args : JSON.stringify(args, null, 2)}
          </pre>
          {result !== undefined && (
            <details className="mt-1 border-t border-border/60 pt-1">
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

const USER_BUBBLE =
  "space-y-2 rounded-2xl border-2 border-border bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-[3px_3px_0_0_var(--lime)]";
const ASSIST_BUBBLE =
  "space-y-2 rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-sm text-foreground shadow-[3px_3px_0_0_var(--border)]";

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
  const timings = message.metadata?.timings;
  const reasoningMs = timings?.reasoning_ms ?? undefined;
  const totalMs = timings?.total_ms ?? timings?.round_ms ?? undefined;

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
     <div className="flex max-w-[80%] min-w-0 flex-col">
      <div className={isUser ? USER_BUBBLE : ASSIST_BUBBLE}>
        {hasReasoning && (
          <details className="rounded-md border-2 border-border/30 bg-background/40 p-2 text-xs text-muted-foreground">
            <summary className="flex cursor-pointer select-none items-center gap-2 font-display font-semibold uppercase tracking-wider">
              <DecryptedText
                text="Reasoned"
                animateOn="view"
                speed={22}
                maxIterations={8}
                sequential
                revealDirection="start"
                className="text-foreground"
                encryptedClassName="text-muted-foreground/60"
              />
              {typeof reasoningMs === "number" && (
                <span className="ml-auto font-mono tabular-nums text-[10px]">
                  {formatDuration(reasoningMs)}
                </span>
              )}
            </summary>
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
              durationMs={tc.duration_ms}
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

      {(message.content || typeof totalMs === "number") && (
        <div className="mt-1 flex w-full items-center gap-1">
          {message.content && (
            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={copy}>
                {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                <span className="ml-1 text-xs">{copied ? "Copied" : "Copy"}</span>
              </Button>
              {isLast && onRegenerate && !isUser && (
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onRegenerate}>
                  <RotateCw className="size-3" />
                  <span className="ml-1 text-xs">Regenerate</span>
                </Button>
              )}
            </div>
          )}
          {!isUser && typeof totalMs === "number" && (
            <span className="ml-auto font-mono tabular-nums text-[10px] text-muted-foreground">
              {formatDuration(totalMs)}
            </span>
          )}
        </div>
      )}
     </div>
    </div>
  );
}

export function StreamingBubble({
  reasoning,
  content,
  toolCalls,
  elapsedMs,
  reasoningElapsedMs,
}: {
  reasoning: string;
  content: string;
  toolCalls: Record<string, StreamingToolCall>;
  elapsedMs: number;
  reasoningElapsedMs: number;
}) {
  const toolList = Object.entries(toolCalls);

  return (
    <div className="group flex flex-col items-start">
     <div className="flex max-w-[80%] min-w-0 flex-col">
      <div className={ASSIST_BUBBLE}>
        {reasoning.length > 0 && (
          <details open className="rounded-md border-2 border-border/30 bg-background/40 p-2 text-xs text-muted-foreground">
            <summary className="flex cursor-pointer select-none items-center gap-2 font-display font-semibold uppercase tracking-wider">
              <DecryptedText
                text="Thinking"
                animateOn="view"
                speed={28}
                maxIterations={14}
                sequential={false}
                className="text-foreground"
                encryptedClassName="text-[color:var(--lime-foreground)]/70"
              />
              <span
                aria-hidden
                className="inline-flex items-center gap-0.5"
              >
                <span className="h-1 w-1 animate-pulse rounded-full bg-[color:var(--lime)]" />
                <span className="h-1 w-1 animate-pulse rounded-full bg-[color:var(--lime)] [animation-delay:150ms]" />
                <span className="h-1 w-1 animate-pulse rounded-full bg-[color:var(--lime)] [animation-delay:300ms]" />
              </span>
              {reasoningElapsedMs > 0 && (
                <span className="ml-auto font-mono tabular-nums text-[10px]">
                  {formatDuration(reasoningElapsedMs)}
                </span>
              )}
            </summary>
            <pre className="mt-1 whitespace-pre-wrap font-sans text-xs">{reasoning}</pre>
          </details>
        )}
        {toolList.map(([id, tc]) => (
          <ToolCallCard
            key={id}
            name={tc.name}
            args={tc.arguments}
            result={tc.result}
            durationMs={tc.duration_ms}
          />
        ))}
        {content && <Markdown text={content} />}
        <span className="inline-block animate-pulse text-xs text-muted-foreground">●</span>
      </div>
      <div className="mt-1 w-full">
        <span className="ml-auto block w-fit font-mono tabular-nums text-[10px] text-muted-foreground">
          {formatDuration(elapsedMs)}
        </span>
      </div>
     </div>
    </div>
  );
}
