import { ToolsList } from "@/components/tools/tools-list";

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold leading-tight">
          Pick what the axolotl can <span className="italic">reach for</span>.
        </h1>
        <p className="text-sm text-muted-foreground">
          Each tool is local-first. Toggle any off and the model will stop
          calling it.
        </p>
      </header>

      <ToolsList />
    </div>
  );
}
