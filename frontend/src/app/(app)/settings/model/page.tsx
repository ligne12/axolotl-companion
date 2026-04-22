import { ComingSoon } from "@/components/settings/coming-soon";

export default function ModelPage() {
  return (
    <ComingSoon title="Model & generation" milestone="F4.3">
      Per-session model picker + hyperparameters (temperature, top_p, top_k,
      min_p, presence_penalty, repetition_penalty, max_tokens) with a
      reset-to-defaults button.
    </ComingSoon>
  );
}
