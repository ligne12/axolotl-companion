import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/** Inline markdown renderer sharing the ``.markdown-body`` DA styles with
 * the chat bubbles. Pass extra classes to tighten spacing (e.g. for card
 * previews). */
export function Markdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("markdown-body", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
