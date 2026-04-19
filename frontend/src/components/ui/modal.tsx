"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Canonical modal primitive for the pixel-neubru DA.
 * See DESIGN.md §5 for the visual contract.
 *
 * Usage:
 *   <Modal open={open} onOpenChange={setOpen} title="Delete *conversation*?">
 *     <p>This can't be undone.</p>
 *     <Modal.Footer>
 *       <Modal.Cancel>Cancel</Modal.Cancel>
 *       <Modal.Confirm onClick={doDelete} variant="destructive">Delete</Modal.Confirm>
 *     </Modal.Footer>
 *   </Modal>
 *
 * For plain yes/no prompts prefer ``ConfirmDialog`` — it wraps this with
 * sensible defaults.
 */
function ModalRoot({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Title string; wrap the emphasis word in asterisks for italic accent. */
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-40 bg-black/55 will-change-[opacity] data-[state=open]:animate-[axo-fade-in_200ms_ease-out] data-[state=closed]:animate-[axo-fade-out_180ms_ease-in]"
        />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "w-[min(90vw,28rem)] max-w-md",
            "border-2 border-border bg-card rounded-xl p-6",
            "shadow-[4px_4px_0_0_var(--border)]",
            "focus:outline-none will-change-[opacity]",
            "data-[state=open]:animate-[axo-fade-in_200ms_ease-out]",
            "data-[state=closed]:animate-[axo-fade-out_180ms_ease-in]",
            className,
          )}
        >
          <Dialog.Close asChild>
            <button
              type="button"
              aria-label="Close"
              className="absolute right-3 top-3 text-muted-foreground transition-colors hover:text-destructive focus:outline-none focus-visible:text-foreground"
            >
              <X className="size-5" />
            </button>
          </Dialog.Close>

          {title && (
            <Dialog.Title asChild>
              <h2 className="font-display text-xl font-bold leading-tight">
                {renderTitle(title)}
              </h2>
            </Dialog.Title>
          )}

          {description && (
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">
              {description}
            </Dialog.Description>
          )}

          {children && <div className="mt-4 space-y-4 text-sm">{children}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Render a ``Title *with emphasis*`` string, wrapping the ``*..*`` parts in italic. */
function renderTitle(title: string): ReactNode {
  const parts = title.split(/(\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) {
      return (
        <span key={i} className="italic">
          {p.slice(1, -1)}
        </span>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
      {children}
    </div>
  );
}

function ModalCancel({ children }: { children: ReactNode }) {
  return (
    <Dialog.Close asChild>
      <button
        type="button"
        className="inline-flex items-center justify-center border-2 border-border bg-card px-4 py-2 text-sm font-semibold shadow-[3px_3px_0_0_var(--border)] transition-[transform,box-shadow] duration-100 hover:shadow-[4px_4px_0_0_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--border)]"
      >
        {children}
      </button>
    </Dialog.Close>
  );
}

function ModalConfirm({
  children,
  onClick,
  variant = "default",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
}) {
  const isDestructive = variant === "destructive";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center border-2 border-border px-4 py-2 text-sm font-semibold transition-[transform,box-shadow] duration-100",
        isDestructive
          ? "bg-destructive text-destructive-foreground shadow-[3px_3px_0_0_var(--border)] hover:shadow-[4px_4px_0_0_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--border)]"
          : "bg-primary text-primary-foreground shadow-[3px_3px_0_0_var(--lime)] hover:shadow-[4px_4px_0_0_var(--lime)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--lime)]",
        "disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      {children}
    </button>
  );
}

export const Modal = Object.assign(ModalRoot, {
  Footer: ModalFooter,
  Cancel: ModalCancel,
  Confirm: ModalConfirm,
});
