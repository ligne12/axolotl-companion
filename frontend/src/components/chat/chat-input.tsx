"use client";

import { Send, Square } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const value = text.trim();
    if (!value || isSending || disabled) return;
    onSend(value);
    setText("");
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <div className="border-t bg-background p-3">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
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
          rows={1}
          disabled={disabled}
          placeholder="Send a message... (Shift+Enter for newline)"
          className="min-h-[40px] max-h-48 flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
        {isSending ? (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={onStop}
            aria-label="Stop"
          >
            <Square />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            onClick={submit}
            disabled={!text.trim() || disabled}
            aria-label="Send"
          >
            <Send />
          </Button>
        )}
      </div>
    </div>
  );
}
