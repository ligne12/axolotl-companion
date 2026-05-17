"use client";

import { useEffect, useState } from "react";

import type { AxolotlMood } from "@/components/axolotl/axolotl-3d";
import { ENERGY_PERKY, ENERGY_TIRED, useChatStatus } from "@/stores/chat-status";

/**
 * Window during which we hold the ``happy`` clip after a chat round
 * completes — gives the user a beat to register the success before
 * the mascot rolls back to ``idle``.
 */
const HAPPY_AFTER_DONE_MS = 3_000;

/**
 * ``listening`` flourish window. Triggered when the user submits a
 * message; useful only briefly because the orchestrator usually starts
 * streaming within a few hundred ms and the mood flips to ``thinking``
 * on the first reasoning / content token.
 */
const LISTENING_MS = 800;

/**
 * Derive the current mascot mood from the chat-status store. Both
 * ``HomeHero`` and the in-chat composer mascot consume this hook so
 * the seven-state grammar stays in one place.
 *
 * Optional ``poke`` flag lets callers (the home hero today) splash a
 * ``happy`` mood for ~3 s without polluting the store — keeps the
 * "click the axolotl" gesture local to whichever component owns it.
 */
export function useMood({ poke = false }: { poke?: boolean } = {}): AxolotlMood {
  const isSending = useChatStatus((s) => s.isSending);
  const tokensPerSec = useChatStatus((s) => s.tokensPerSec);
  const currentTool = useChatStatus((s) => s.currentTool);
  const lastError = useChatStatus((s) => s.lastError);
  const energy = useChatStatus((s) => s.energy);

  // Stamps for the timed windows. ``justFinishedAt`` flips when the
  // send turns off; ``listeningUntil`` flips when it turns on.
  const [justFinishedAt, setJustFinishedAt] = useState<number | null>(null);
  const [listeningUntil, setListeningUntil] = useState<number | null>(null);
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (isSending) {
      setListeningUntil(Date.now() + LISTENING_MS);
    } else if (listeningUntil !== null) {
      // ``isSending`` flipped to false → record the completion stamp.
      setJustFinishedAt(Date.now());
    }
    // ``listeningUntil`` is intentionally not in deps: we only act on
    // the ``isSending`` transition; reading the captured value is
    // enough to know we ever entered the sending state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSending]);

  // Repaint when the timed windows expire so the derived mood rolls
  // back to a stable state.
  useEffect(() => {
    const now = Date.now();
    const stamps = [
      listeningUntil,
      justFinishedAt !== null ? justFinishedAt + HAPPY_AFTER_DONE_MS : null,
    ].filter((s): s is number => s !== null && s > now);
    if (stamps.length === 0) return;
    const next = Math.min(...stamps);
    const t = setTimeout(() => forceTick((n) => n + 1), next - now + 10);
    return () => clearTimeout(t);
  }, [listeningUntil, justFinishedAt]);

  const now = Date.now();

  // Highest-priority states first.
  if (lastError) return "confused";
  if (poke) return "happy";

  if (isSending) {
    if (currentTool) return "searching";
    if (tokensPerSec !== null && tokensPerSec > 0) return "typing";
    if (listeningUntil !== null && now < listeningUntil) return "listening";
    return "thinking";
  }

  if (justFinishedAt !== null && now < justFinishedAt + HAPPY_AFTER_DONE_MS) {
    return "happy";
  }

  // Idle bias driven by the energy counter. With only seven clips
  // available today we lean on ``happy`` / ``confused`` instead of
  // distinct ``idle-perky`` / ``idle-rest`` variants — those land when
  // the Blender file ships them.
  if (energy >= ENERGY_PERKY) return "happy";
  if (energy <= ENERGY_TIRED) return "confused";

  return "idle";
}
