"use client";

import { Send, SlidersHorizontal, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { ChatMascot } from "@/components/chat/chat-mascot";
import { useHaptic } from "@/hooks/use-haptic";
import { cn } from "@/lib/utils";

export function ChatInput({
  onSend,
  onStop,
  onOpenControls,
  isSending,
  disabled,
}: {
  onSend: (content: string) => void;
  onStop: () => void;
  onOpenControls?: () => void;
  isSending: boolean;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const haptic = useHaptic();
  const t = useTranslations("chat");

  const submit = () => {
    const value = text.trim();
    if (!value || isSending || disabled) return;
    haptic("tap");
    onSend(value);
    setText("");
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const canSend = Boolean(text.trim()) && !isSending && !disabled;

  return (
    // Transparent wrapper so the global PixelBlast drift shows through.
    // No ``border-t`` — the terminal footer below provides the single
    // bottom-of-shell separator. Extra bottom padding lifts the input
    // away from the footer's LOCAL line.
    <div className="px-3 pt-3 pb-8">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <ChatMascot />
        {onOpenControls && (
          <button
            type="button"
            onClick={() => {
              haptic("select");
              onOpenControls();
            }}
            aria-label={t("controlsLabel")}
            title={`${t("controlsLabel")} (⌘,)`}
            className="border-border bg-card text-muted-foreground hover:text-foreground inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 shadow-[3px_3px_0_0_var(--border)] transition-[transform,box-shadow,color] duration-100 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_0_var(--border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_0_var(--border)]"
          >
            <SlidersHorizontal className="size-4" />
          </button>
        )}
        <div
          className={cn(
            "border-border bg-card flex flex-1 items-end rounded-xl border-2 transition-[box-shadow] duration-100",
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
            placeholder={t("sendPlaceholder")}
            className="placeholder:text-muted-foreground max-h-48 min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        {isSending ? (
          <button
            type="button"
            onClick={() => {
              haptic("error");
              onStop();
            }}
            aria-label={t("stop")}
            className="border-border bg-destructive text-destructive-foreground inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 shadow-[3px_3px_0_0_var(--border)] transition-[transform,box-shadow] duration-100 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_0_var(--border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_0_var(--border)]"
          >
            <Square className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            aria-label={t("send")}
            className={cn(
              "border-border bg-primary text-primary-foreground inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 transition-[transform,box-shadow] duration-100",
              canSend
                ? "shadow-[3px_3px_0_0_var(--lime)] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_0_var(--lime)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_0_var(--lime)]"
                : "opacity-60 shadow-[3px_3px_0_0_var(--border)]",
            )}
          >
            <Send className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
