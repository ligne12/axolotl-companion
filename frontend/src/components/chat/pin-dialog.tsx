"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/modal";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import type { PinCreate, PinPublic } from "@/types/api";

const INPUT =
  "w-full border-2 border-border bg-card px-3 py-2 text-sm outline-none transition-[box-shadow] duration-100 focus:shadow-[3px_3px_0_0_var(--lime)] placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60";

const LABEL = "block text-xs font-semibold uppercase tracking-wider";

const TITLE_MAX = 200;

/**
 * Default title: a short, single-line summary derived from the message
 * body. We strip markdown noise (``\n``, ``#``, ``*``, ``\` ``) so the
 * suggestion isn't an eyesore, then take the first ~60 chars.
 */
function suggestedTitle(body: string): string {
  const flat = body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[*_#>`-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (flat.length <= 60) return flat;
  return flat.slice(0, 57).trimEnd() + "…";
}

export function PinDialog({
  open,
  onOpenChange,
  messageId,
  messageContent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageId: string;
  messageContent: string;
}) {
  const api = useApi();
  const qc = useQueryClient();
  const t = useTranslations("pins");
  const tc = useTranslations("common");

  const [title, setTitle] = useState("");

  // Reset the field every time the modal opens with a new message — the
  // suggestion is per-message, not per-mount.
  useEffect(() => {
    if (open) setTitle(suggestedTitle(messageContent));
  }, [open, messageContent]);

  const create = useMutation({
    mutationFn: (body: PinCreate) => api<PinPublic>("/v1/pins", { method: "POST", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pins"] });
      toast.success(t("toasts.pinned"));
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      // The backend returns 409 with detail "Message already pinned"
      // — surface a friendlier toast for the common case.
      const status = (err as { status?: number })?.status;
      toast.error(status === 409 ? t("toasts.alreadyPinned") : t("toasts.errPin"));
    },
  });

  const trimmed = title.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= TITLE_MAX && !create.isPending;

  function submit() {
    if (!canSubmit) return;
    create.mutate({ message_id: messageId, title: trimmed });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("modal.title")}
      description={t("modal.description")}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <label htmlFor="pin-title" className={LABEL}>
            {t("modal.titleLabel")}
          </label>
          <input
            id="pin-title"
            className={cn(INPUT)}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={TITLE_MAX}
            placeholder={t("modal.titlePlaceholder")}
            autoFocus
            required
          />
          <p className="text-muted-foreground text-xs">{t("modal.titleHelp")}</p>
        </div>
        <Modal.Footer>
          <Modal.Cancel>{tc("cancel")}</Modal.Cancel>
          <Modal.Confirm onClick={submit} disabled={!canSubmit}>
            {create.isPending ? t("modal.pinning") : t("modal.pin")}
          </Modal.Confirm>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
