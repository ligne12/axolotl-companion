"use client";

import { Modal } from "@/components/ui/modal";

/**
 * Yes/no prompt. Drop-in replacement for ``window.confirm()`` matching the DA.
 *
 * Controlled: pass ``open`` + ``onOpenChange`` from the parent. ``onConfirm``
 * runs before the dialog closes; throw or return a promise if it should
 * block dismissal (caller is responsible for error handling).
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Title — wrap the emphasis word in asterisks: ``Delete *conversation*?``. */
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void | Promise<void>;
}) {
  async function handleConfirm() {
    await onConfirm();
    onOpenChange(false);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <Modal.Footer>
        <Modal.Cancel>{cancelLabel}</Modal.Cancel>
        <Modal.Confirm onClick={() => void handleConfirm()} variant={variant}>
          {confirmLabel}
        </Modal.Confirm>
      </Modal.Footer>
    </Modal>
  );
}
