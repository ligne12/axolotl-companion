import { Send, SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Streamed skeleton for the chat session route. Shown automatically by
 * Next's App Router during the server-side `auth()` + `apiFetch(SessionDetail)`
 * await — i.e. exactly the gap users hit when tapping a different
 * conversation in the sidebar / palette.
 *
 * Same shell shape as ChatWindow so the swap-in feels like content
 * arriving, not a layout change. Bubbles use a soft pulse instead of a
 * shimmer gradient — cheaper, fits the design language better.
 */
export default function ChatSessionLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent_0,black_32px,black_calc(100%-32px),transparent_100%)]">
        <div className="mx-auto max-w-3xl space-y-4 p-4">
          <SkeletonBubble side="user" widthClass="w-[60%]" />
          <SkeletonBubble side="assistant" widthClass="w-[78%]" lines={3} />
          <SkeletonBubble side="user" widthClass="w-[45%]" />
          <SkeletonBubble side="assistant" widthClass="w-[68%]" lines={2} />
        </div>
      </div>

      {/* Chat input shell — static, disabled. Mirrors ChatInput so the
          input doesn't jump when the real one mounts. */}
      <div className="px-3 pt-3 pb-8" aria-hidden>
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-border bg-card text-muted-foreground/40 shadow-[3px_3px_0_0_var(--border)]">
            <SlidersHorizontal className="size-4" />
          </div>
          <div className="flex flex-1 items-end rounded-xl border-2 border-border bg-card shadow-[3px_3px_0_0_var(--border)]">
            <div className="min-h-[40px] flex-1 px-3 py-2.5 text-sm text-muted-foreground/60">
              Loading…
            </div>
          </div>
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-border bg-primary/40 text-primary-foreground/50 shadow-[3px_3px_0_0_var(--border)]">
            <Send className="size-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonBubble({
  side,
  widthClass,
  lines = 1,
}: {
  side: "user" | "assistant";
  widthClass: string;
  lines?: 1 | 2 | 3;
}) {
  const isUser = side === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] space-y-2 rounded-2xl border-2 border-border px-4 py-2.5 motion-safe:animate-pulse",
          widthClass,
          isUser
            ? "bg-primary/30 shadow-[3px_3px_0_0_var(--lime)]"
            : "bg-card shadow-[3px_3px_0_0_var(--border)]",
        )}
      >
        <div
          className={cn(
            "h-2 w-full rounded",
            isUser ? "bg-primary-foreground/30" : "bg-muted-foreground/30",
          )}
        />
        {lines >= 2 && (
          <div
            className={cn(
              "h-2 w-[80%] rounded",
              isUser ? "bg-primary-foreground/20" : "bg-muted-foreground/25",
            )}
          />
        )}
        {lines >= 3 && (
          <div
            className={cn(
              "h-2 w-[55%] rounded",
              isUser ? "bg-primary-foreground/20" : "bg-muted-foreground/20",
            )}
          />
        )}
      </div>
    </div>
  );
}
