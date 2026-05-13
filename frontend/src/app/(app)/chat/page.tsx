import { LotusLogo } from "@/components/layout/lotus-logo";

export default function ChatIndexPage() {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <div className="flex flex-col items-center gap-2">
        <LotusLogo className="size-10" />
        <h1 className="text-2xl font-semibold">Axolotl Companion</h1>
        <p className="text-muted-foreground">
          Start a new conversation from the sidebar, or pick an existing one.
        </p>
      </div>
    </div>
  );
}
