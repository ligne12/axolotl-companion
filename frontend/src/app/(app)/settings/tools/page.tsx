"use client";

import { useTranslations } from "next-intl";

import { ToolsList } from "@/components/tools/tools-list";

export default function ToolsPage() {
  const t = useTranslations("tools");
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl leading-tight font-bold">
          {t.rich("title", {
            em: (chunks) => <span className="italic">{chunks}</span>,
          })}
        </h1>
        <p className="text-muted-foreground text-sm">{t("intro")}</p>
      </header>

      <ToolsList />
    </div>
  );
}
