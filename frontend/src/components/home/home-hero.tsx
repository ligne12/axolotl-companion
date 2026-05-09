"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquarePlus, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AxolotlSprite, type AxolotlMood } from "@/components/axolotl/axolotl-sprite";

// Three.js bundle (~150 KB gz) is heavy; defer it from the initial paint.
const Axolotl3D = dynamic(
  () => import("@/components/axolotl/axolotl-3d").then((m) => m.Axolotl3D),
  { ssr: false, loading: () => <AxolotlSprite mood="idle" size={150} /> },
);
import CircularText from "@/components/reactbits/circular-text";
import ClickSpark from "@/components/reactbits/click-spark";
import Magnet from "@/components/reactbits/magnet";
import PixelSnow from "@/components/reactbits/pixel-snow";
import TextType from "@/components/reactbits/text-type";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { useChatStatus } from "@/stores/chat-status";
import type { SessionPublic } from "@/types/api";

export function HomeHero({
  name,
  hasSessions,
  lastSessionId,
}: {
  name: string;
  hasSessions: boolean;
  lastSessionId?: string;
}) {
  const router = useRouter();
  const api = useApi();
  const qc = useQueryClient();
  const t = useTranslations("home");
  const tn = useTranslations("nav");
  // ``useTranslations.raw`` returns the array under "home.greetings" as-is
  // (next-intl array support) so TextType still gets a list of strings.
  const greetings = (t.raw("greetings") as string[]) ?? [];
  const [pokedUntil, setPokedUntil] = useState<number>(0);
  const [justFinishedUntil, setJustFinishedUntil] = useState<number>(0);
  const [, forceTick] = useState(0);
  const isSending = useChatStatus((s) => s.isSending);
  const tokensPerSec = useChatStatus((s) => s.tokensPerSec);
  const currentTool = useChatStatus((s) => s.currentTool);
  const lastError = useChatStatus((s) => s.lastError);

  // Stamp a 3s "happy" window each time a stream completes.
  useEffect(() => {
    if (!isSending) return;
    return () => setJustFinishedUntil(Date.now() + 3000);
  }, [isSending]);

  // Re-render when the timed windows (poke, justFinished) elapse so the
  // derived `mood` below can roll back to idle.
  useEffect(() => {
    const target = Math.max(pokedUntil, justFinishedUntil);
    if (target <= Date.now()) return;
    const t = setTimeout(() => forceTick((n) => n + 1), target - Date.now());
    return () => clearTimeout(t);
  }, [pokedUntil, justFinishedUntil]);

  const mood: AxolotlMood = (() => {
    const now = Date.now();
    if (lastError) return "confused";
    if (now < pokedUntil) return "happy";
    if (currentTool === "web_search") return "searching";
    if (isSending && tokensPerSec !== null && tokensPerSec > 0) return "typing";
    if (isSending) return "thinking";
    if (now < justFinishedUntil) return "happy";
    return "idle";
  })();

  const createSession = useMutation({
    mutationFn: () =>
      api<SessionPublic>("/v1/sessions", {
        method: "POST",
        body: { title: tn("newConversation") },
      }),
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      router.push(`/chat/${s.id}`);
    },
    onError: () => toast.error(t("errCreate")),
  });

  return (
    <section className="relative isolate overflow-hidden rounded-[28px] border-2 border-border bg-card p-6 shadow-[3px_3px_0_0_var(--border)] md:p-10">
      {/* Hero-local snow layer — drifts on top of the global PixelBlast wash */}
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <PixelSnow
          color="#baff39"
          density={0.12}
          speed={0.45}
          brightness={0.55}
          pixelResolution={280}
          variant="square"
        />
      </div>

      <div className="relative z-10 flex flex-col items-start gap-8 md:flex-row md:items-center md:gap-12">
        {/* Axolotl wrapped in a circular ring of text (ring sits above the card) */}
        <div className="relative shrink-0">
          <ClickSpark sparkColor="#baff39" sparkCount={14} sparkRadius={26} duration={500}>
            <button
              type="button"
              onClick={() => setPokedUntil(Date.now() + 3000)}
              aria-label={t("poke")}
              className="relative z-10 rounded-2xl border-2 border-border bg-card p-3 shadow-[3px_3px_0_0_var(--border)] transition-[transform,box-shadow] duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--border)]"
            >
              <Axolotl3D mood={mood} size={150} />
            </button>
          </ClickSpark>
          <div className="pointer-events-none absolute inset-0 -m-6 z-20 flex items-center justify-center">
            <CircularText
              text="AXOLOTL ✦ COMPANION ✦ LOCAL ✦ FIRST ✦ "
              spinDuration={28}
              onHover="speedUp"
              className="!h-[220px] !w-[220px] !text-[11px] !text-foreground font-pixel !uppercase !tracking-[0.18em]"
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 max-w-xl flex-col gap-4 text-left">
          <span className="inline-flex w-fit items-center gap-2 border-2 border-border bg-card px-2.5 py-1 font-pixel text-[12px] uppercase tracking-[0.14em]">
            <span className="size-2 bg-[color:var(--lime)]" />
            {t("hi", { name })}
          </span>

          <h1 className="font-display text-4xl font-bold uppercase leading-[1.05] md:text-5xl">
            {t.rich("title", {
              em: (chunks) => <span className="italic">{chunks}</span>,
            })}
          </h1>

          <TextType
            as="p"
            className="min-h-[3rem] max-w-md text-balance leading-snug text-muted-foreground"
            text={greetings}
            typingSpeed={38}
            deletingSpeed={18}
            pauseDuration={2600}
            cursorCharacter="▍"
            cursorClassName="text-foreground"
          />

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Magnet padding={80} magnetStrength={3}>
              <button
                type="button"
                onClick={() => createSession.mutate()}
                disabled={createSession.isPending}
                className={cn(
                  "group inline-flex items-center gap-2 border-2 border-border bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground",
                  "shadow-[3px_3px_0_0_var(--lime)] transition-[transform,box-shadow] duration-100",
                  "hover:shadow-[4px_4px_0_0_var(--lime)]",
                  "active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--lime)]",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                <MessageSquarePlus className="size-4" />
                {t("newConversation")}
              </button>
            </Magnet>

            {hasSessions && lastSessionId !== undefined && (
              <Magnet padding={80} magnetStrength={4}>
                <Link
                  href={`/chat/${lastSessionId}`}
                  className={cn(
                    "inline-flex items-center gap-2 border-2 border-border bg-card px-5 py-2.5 text-sm font-semibold",
                    "shadow-[3px_3px_0_0_var(--border)] transition-[transform,box-shadow] duration-100",
                    "hover:shadow-[4px_4px_0_0_var(--border)]",
                    "active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--border)]",
                  )}
                >
                  <Sparkles className="size-4" />
                  {t("resumeLast")}
                </Link>
              </Magnet>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
