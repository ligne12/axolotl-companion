"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, PinOff } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { toast } from "sonner";

import { Markdown } from "@/components/ui/markdown";
import { useApi } from "@/hooks/use-api";
import type { PinPublic } from "@/types/api";

function PinnedCard({ pin }: { pin: PinPublic }) {
  const api = useApi();
  const qc = useQueryClient();
  const t = useTranslations("pins");

  const unpin = useMutation({
    mutationFn: () => api<void>(`/v1/pins/${pin.id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pins"] });
      toast.success(t("toasts.unpinned"));
    },
    onError: () => toast.error(t("toasts.errUnpin")),
  });

  return (
    <article className="group border-border bg-card relative flex h-full flex-col justify-between gap-3 rounded-xl border-2 p-4 shadow-[3px_3px_0_0_var(--border)] transition-[transform,box-shadow] duration-100 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0_0_var(--lime)]">
      <div className="space-y-2">
        <h3 className="font-display line-clamp-2 leading-tight font-bold">{pin.title}</h3>
        <div className="text-muted-foreground line-clamp-5 text-xs leading-relaxed">
          <Markdown text={pin.excerpt} />
        </div>
      </div>
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <Link
          href={`/chat/${pin.session_id}#m-${pin.message_id}`}
          className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
        >
          {t("card.jumpToSource")}
          <ArrowRight className="size-3 translate-x-[-2px] transition-transform group-hover:translate-x-0" />
        </Link>
        <button
          type="button"
          onClick={() => unpin.mutate()}
          disabled={unpin.isPending}
          className="hover:text-destructive inline-flex items-center gap-1 transition-colors disabled:opacity-60"
          aria-label={t("card.unpin")}
        >
          <PinOff className="size-3" />
          <span>{t("card.unpin")}</span>
        </button>
      </div>
    </article>
  );
}

/**
 * Client-side ``/v1/pins`` list rendered as a 2-column grid between the
 * home hero and the recent-sessions list. Hidden entirely when the user
 * has no pins yet — keeps a fresh ``/home`` from showing a dead section.
 */
export function PinnedSection() {
  const api = useApi();
  const t = useTranslations("pins");
  const pins = useQuery({
    queryKey: ["pins"],
    queryFn: () => api<PinPublic[]>("/v1/pins"),
  });

  if (pins.isLoading || !pins.data || pins.data.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="font-display text-muted-foreground mb-3 text-sm font-semibold tracking-[0.2em] uppercase">
        {t("section.title")}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {pins.data.map((pin, i) => (
          <motion.li
            key={pin.id}
            initial={{ opacity: 0, y: 10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.32, delay: Math.min(i, 8) * 0.06, ease: "easeOut" }}
          >
            <PinnedCard pin={pin} />
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
