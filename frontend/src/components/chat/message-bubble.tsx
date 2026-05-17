"use client";

import { Check, Copy, Pin, Plug, RotateCw, Search, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { PinDialog } from "@/components/chat/pin-dialog";
import DecryptedText from "@/components/reactbits/decrypted-text";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import type { StreamingToolCall } from "@/hooks/use-chat";
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
      <div className="space-y-0.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-pixel inline-flex items-center gap-1.5 tracking-[0.14em] uppercase">
            <Search className="size-3.5" aria-hidden />
            Web search · {results.length} result{results.length > 1 ? "s" : ""}
          </span>
          {typeof durationMs === "number" && (
            <span className="text-muted-foreground shrink-0 font-mono text-[10px] tabular-nums">
              {formatDuration(durationMs)}
            </span>
          )}
        </div>
        <p className="text-muted-foreground line-clamp-2 text-xs italic" title={query}>
          “{query}”
        </p>
      </div>
      <ul className="space-y-1.5">
        {results.map((r, i) => (
          <li
            key={r.url + i}
            className="border-border bg-card rounded-md border-2 p-2 shadow-[2px_2px_0_0_var(--border)] transition-[transform,box-shadow] duration-100 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_0_var(--lime)]"
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
                <span className="bg-muted mt-0.5 size-4 shrink-0 rounded-sm" />
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
                <div className="text-muted-foreground truncate text-[10px]">
                  {r.domain ?? new URL(r.url).hostname}
                </div>
                {r.snippet && (
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{r.snippet}</p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function isWebSearchResult(result: unknown): result is { query: string; results: SearchResult[] } {
  return (
    typeof result === "object" &&
    result !== null &&
    "results" in result &&
    Array.isArray((result as { results: unknown }).results)
  );
}

type MCPNameParts = { serverId: number; toolName: string };

function parseMcpName(name: string): MCPNameParts | null {
  if (!name.startsWith("mcp__")) return null;
  const body = name.slice("mcp__".length);
  const sep = body.indexOf("__");
  if (sep <= 0) return null;
  const serverId = Number(body.slice(0, sep));
  if (!Number.isInteger(serverId)) return null;
  return { serverId, toolName: body.slice(sep + 2) };
}

type MCPContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType?: string }
  | { type: "resource"; resource: { uri?: string; text?: string } };

function isMcpResult(result: unknown): result is { content: MCPContentBlock[]; isError?: boolean } {
  if (typeof result !== "object" || result === null) return false;
  const r = result as { content?: unknown };
  return Array.isArray(r.content);
}

function MCPToolCard({
  parts,
  args,
  result,
  durationMs,
}: {
  parts: MCPNameParts;
  args: unknown;
  result?: unknown;
  durationMs?: number;
}) {
  const isErrored = isMcpResult(result) && result.isError === true;
  const blocks = isMcpResult(result) ? result.content : null;

  return (
    <div
      className={cn(
        "bg-card rounded-md border-2 p-2.5 text-xs shadow-[2px_2px_0_0_var(--border)]",
        isErrored ? "border-destructive/60" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-pixel inline-flex items-center gap-1.5 tracking-[0.14em] uppercase">
          <Plug className="size-3.5" aria-hidden />
          MCP
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="font-mono tracking-normal normal-case" title={`server #${parts.serverId}`}>
          #{parts.serverId}
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-foreground truncate font-mono tracking-normal normal-case">
          {parts.toolName}
        </span>
        {typeof durationMs === "number" && (
          <span className="text-muted-foreground ml-auto font-mono text-[10px] tabular-nums">
            {formatDuration(durationMs)}
          </span>
        )}
      </div>

      {/* Args — single-line preview, expand for full payload */}
      <details className="border-border/60 mt-1.5 border-t pt-1.5">
        <summary className="text-muted-foreground cursor-pointer text-[10px] tracking-[0.14em] uppercase">
          Args
        </summary>
        <pre className="text-muted-foreground mt-1 break-words whitespace-pre-wrap">
          {typeof args === "string" ? args : JSON.stringify(args, null, 2)}
        </pre>
      </details>

      {/* Result — render text blocks inline, JSON-fall back for the rest */}
      {result !== undefined && (
        <div className="border-border/60 mt-1.5 border-t pt-1.5">
          {blocks ? (
            <div className="space-y-1.5">
              {blocks.map((b, i) => {
                if (b.type === "text") {
                  return (
                    <pre
                      key={i}
                      className={cn(
                        "leading-relaxed break-words whitespace-pre-wrap",
                        isErrored ? "text-[color:var(--destructive)]" : "text-foreground",
                      )}
                    >
                      {b.text}
                    </pre>
                  );
                }
                if (b.type === "image") {
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={`data:${b.mimeType ?? "image/png"};base64,${b.data}`}
                      alt={`MCP result ${i}`}
                      className="border-border max-h-64 rounded-sm border-2"
                    />
                  );
                }
                if (b.type === "resource") {
                  return (
                    <div key={i} className="text-muted-foreground">
                      <span className="font-pixel text-[9px] tracking-[0.14em] uppercase">
                        resource
                      </span>
                      {b.resource.uri && (
                        <span className="ml-2 font-mono normal-case">{b.resource.uri}</span>
                      )}
                      {b.resource.text && (
                        <pre className="mt-1 break-words whitespace-pre-wrap">
                          {b.resource.text}
                        </pre>
                      )}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          ) : (
            <pre className="text-muted-foreground break-words whitespace-pre-wrap">
              {JSON.stringify(result, null, 2).slice(0, 1500)}
            </pre>
          )}
        </div>
      )}
    </div>
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
  const mcpParts = parseMcpName(name);

  if (mcpParts) {
    return <MCPToolCard parts={mcpParts} args={args} result={result} durationMs={durationMs} />;
  }

  return (
    <div className="border-border bg-card rounded-md border-2 p-2.5 text-xs shadow-[2px_2px_0_0_var(--border)]">
      {isWebSearch ? (
        <WebSearchResults
          query={(result as { query: string }).query ?? ""}
          results={(result as { results: SearchResult[] }).results}
          durationMs={durationMs}
        />
      ) : (
        <>
          <div className="flex items-center gap-1.5">
            <span className="font-pixel inline-flex items-center gap-1.5 tracking-[0.14em] uppercase">
              <Wrench className="size-3.5" aria-hidden />
              {name}
            </span>
            {typeof durationMs === "number" && (
              <span className="text-muted-foreground ml-auto font-mono text-[10px] tabular-nums">
                {formatDuration(durationMs)}
              </span>
            )}
          </div>
          <pre className="text-muted-foreground mt-1 break-words whitespace-pre-wrap">
            {typeof args === "string" ? args : JSON.stringify(args, null, 2)}
          </pre>
          {result !== undefined && (
            <details className="border-border/60 mt-1 border-t pt-1">
              <summary className="text-muted-foreground cursor-pointer">Result</summary>
              <pre className="text-muted-foreground mt-1 break-words whitespace-pre-wrap">
                {JSON.stringify(result, null, 2).slice(0, 1500)}
              </pre>
            </details>
          )}
        </>
      )}
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
  const [pinOpen, setPinOpen] = useState(false);
  const t = useTranslations("pins");
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
    <div
      id={`m-${message.id}`}
      className={cn("group flex scroll-mt-24 flex-col", isUser ? "items-end" : "items-start")}
    >
      <div className="flex max-w-[80%] min-w-0 flex-col">
        <div className={isUser ? USER_BUBBLE : ASSIST_BUBBLE}>
          {hasReasoning && (
            <details className="border-border/30 bg-background/40 text-muted-foreground rounded-md border-2 p-2 text-xs">
              <summary className="font-display flex cursor-pointer items-center gap-2 font-semibold tracking-wider uppercase select-none">
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
                  <span className="ml-auto font-mono text-[10px] tabular-nums">
                    {formatDuration(reasoningMs)}
                  </span>
                )}
              </summary>
              <pre className="mt-1 font-sans text-xs whitespace-pre-wrap">{message.reasoning}</pre>
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
                <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
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
                {!isUser && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setPinOpen(true)}
                    aria-label={t("action.pin")}
                  >
                    <Pin className="size-3" />
                    <span className="ml-1 text-xs">{t("action.pin")}</span>
                  </Button>
                )}
                {isLast && onRegenerate && !isUser && (
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onRegenerate}>
                    <RotateCw className="size-3" />
                    <span className="ml-1 text-xs">Regenerate</span>
                  </Button>
                )}
              </div>
            )}
            {!isUser && typeof totalMs === "number" && (
              <span className="text-muted-foreground ml-auto font-mono text-[10px] tabular-nums">
                {formatDuration(totalMs)}
              </span>
            )}
          </div>
        )}
      </div>
      {!isUser && message.content && (
        <PinDialog
          open={pinOpen}
          onOpenChange={setPinOpen}
          messageId={message.id}
          messageContent={message.content}
        />
      )}
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
            <details
              open
              className="border-border/30 bg-background/40 text-muted-foreground rounded-md border-2 p-2 text-xs"
            >
              <summary className="font-display flex cursor-pointer items-center gap-2 font-semibold tracking-wider uppercase select-none">
                <DecryptedText
                  text="Thinking"
                  animateOn="view"
                  speed={28}
                  maxIterations={14}
                  sequential={false}
                  className="text-foreground"
                  encryptedClassName="text-[color:var(--lime-foreground)]/70"
                />
                <span aria-hidden className="inline-flex items-center gap-0.5">
                  <span className="h-1 w-1 animate-pulse rounded-full bg-[color:var(--lime)]" />
                  <span className="h-1 w-1 animate-pulse rounded-full bg-[color:var(--lime)] [animation-delay:150ms]" />
                  <span className="h-1 w-1 animate-pulse rounded-full bg-[color:var(--lime)] [animation-delay:300ms]" />
                </span>
                {reasoningElapsedMs > 0 && (
                  <span className="ml-auto font-mono text-[10px] tabular-nums">
                    {formatDuration(reasoningElapsedMs)}
                  </span>
                )}
              </summary>
              <pre className="mt-1 font-sans text-xs whitespace-pre-wrap">{reasoning}</pre>
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
          <span aria-label="Assistant is thinking" className="inline-flex items-end gap-1 py-1">
            <span className="animate-axo-bounce bg-muted-foreground size-1.5 rounded-full" />
            <span className="animate-axo-bounce bg-muted-foreground size-1.5 rounded-full [animation-delay:150ms]" />
            <span className="animate-axo-bounce bg-muted-foreground size-1.5 rounded-full [animation-delay:300ms]" />
          </span>
        </div>
        <div className="mt-1 w-full">
          <span className="text-muted-foreground ml-auto block w-fit font-mono text-[10px] tabular-nums">
            {formatDuration(elapsedMs)}
          </span>
        </div>
      </div>
    </div>
  );
}
