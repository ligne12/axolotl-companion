"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { useHaptic } from "@/hooks/use-haptic";
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
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55 will-change-[opacity] data-[state=closed]:animate-[axo-fade-out_180ms_ease-in] data-[state=open]:animate-[axo-fade-in_200ms_ease-out]" />
        <Dialog.Content
          className={cn(
            // Mobile (< md): bottom-anchored sheet — full width, rounded
            // top corners, slide up from the bottom. The iOS keyboard no
            // longer eats the centred panel; the sheet sits above it.
            "fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] w-full overflow-y-auto",
            "border-border bg-card rounded-t-xl border-x-0 border-t-2 border-b-0 px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]",
            "data-[state=open]:animate-[axo-slide-in-up_220ms_ease-out]",
            "data-[state=closed]:animate-[axo-slide-out-down_180ms_ease-in]",
            // Desktop (md+): centered on viewport, shifted right by half
            // the sidebar width (w-64 = 16rem) so the modal is optically
            // centred inside the main column rather than under the sidebar.
            "md:fixed md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:max-h-[unset] md:-translate-x-1/2 md:-translate-y-1/2 md:overflow-visible md:lg:left-[calc(50%+8rem)]",
            "md:w-[min(90vw,28rem)] md:max-w-md md:rounded-xl md:border-2 md:p-6 md:shadow-[4px_4px_0_0_var(--border)]",
            "md:data-[state=open]:animate-[axo-fade-in_200ms_ease-out]",
            "md:data-[state=closed]:animate-[axo-fade-out_180ms_ease-in]",
            "will-change-[opacity,transform] focus:outline-none",
            className,
          )}
        >
          {/* Bottom-sheet drag handle — visual affordance only on mobile.
              Hidden on md+ where the modal is centred. */}
          <div aria-hidden className="bg-border/50 mx-auto mb-3 h-1 w-10 rounded-full md:hidden" />

          <Dialog.Close asChild>
            <button
              type="button"
              aria-label="Close"
              className="text-muted-foreground hover:text-destructive focus-visible:text-foreground absolute top-3 right-3 inline-flex size-9 items-center justify-center transition-[transform,colors] duration-75 focus:outline-none active:scale-90"
            >
              <X className="size-5" />
            </button>
          </Dialog.Close>

          {title && (
            <Dialog.Title asChild>
              <h2 className="font-display text-xl leading-tight font-bold">{renderTitle(title)}</h2>
            </Dialog.Title>
          )}

          {description && (
            <Dialog.Description className="text-muted-foreground mt-2 text-sm">
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
    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">{children}</div>
  );
}

function ModalCancel({ children }: { children: ReactNode }) {
  const haptic = useHaptic();
  return (
    <Dialog.Close asChild>
      <button
        type="button"
        onClick={() => haptic("tap")}
        className="border-border bg-card inline-flex min-h-11 items-center justify-center border-2 px-4 py-2 text-sm font-semibold shadow-[3px_3px_0_0_var(--border)] transition-[transform,box-shadow] duration-100 hover:shadow-[4px_4px_0_0_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--border)]"
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
  const haptic = useHaptic();
  return (
    <button
      type="button"
      onClick={() => {
        haptic(isDestructive ? "error" : "success");
        onClick?.();
      }}
      disabled={disabled}
      className={cn(
        "border-border inline-flex min-h-11 items-center justify-center border-2 px-4 py-2 text-sm font-semibold transition-[transform,box-shadow] duration-100",
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
