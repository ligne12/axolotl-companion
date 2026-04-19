"use client";

import { Send, Square } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

export function ChatInput({
  onSend,
  onStop,
  isSending,
  disabled,
}: {
  onSend: (content: string) => void;
  onStop: () => void;
  isSending: boolean;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const value = text.trim();
    if (!value || isSending || disabled) return;
    onSend(value);
    setText("");
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const canSend = Boolean(text.trim()) && !isSending && !disabled;

  return (
    // No ``border-t`` here — the terminal footer below provides the single
    // bottom-of-shell separator, so stacking two 2px strokes feels noisy.
    // Extra bottom padding lifts the input away from the footer's LOCAL
    // status line so the two feel like distinct zones.
    <div className="bg-background px-3 pt-3 pb-8">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <div
          className={cn(
            "flex flex-1 items-end rounded-xl border-2 border-border bg-card transition-[box-shadow] duration-100",
            focused ? "shadow-[4px_4px_0_0_var(--lime)]" : "shadow-[3px_3px_0_0_var(--border)]",
          )}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            rows={1}
            disabled={disabled}
            placeholder="Send a message... (Shift+Enter for newline)"
            className="min-h-[40px] max-h-48 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        {isSending ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-border bg-destructive text-destructive-foreground shadow-[3px_3px_0_0_var(--border)] transition-[transform,box-shadow] duration-100 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_0_var(--border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_0_var(--border)]"
          >
            <Square className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            aria-label="Send"
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-border bg-primary text-primary-foreground transition-[transform,box-shadow] duration-100",
              canSend
                ? "shadow-[3px_3px_0_0_var(--lime)] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_0_var(--lime)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_0_var(--lime)]"
                : "shadow-[3px_3px_0_0_var(--border)] opacity-60",
            )}
          >
            <Send className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
