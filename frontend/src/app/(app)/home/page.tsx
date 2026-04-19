import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { HomeHero } from "@/components/home/home-hero";
import { RecentSessions } from "@/components/home/recent-sessions";
import { apiFetch, ApiError } from "@/lib/api";
import type { SessionPublic } from "@/types/api";

export default async function HomePage() {
  const session = await auth();
  if (!session?.accessToken || session.error === "RefreshAccessTokenError") {
    redirect("/login");
  }
  const token = session.accessToken;
  const name = session.user?.name ?? "friend";

  let recent: SessionPublic[] = [];
  try {
    recent = await apiFetch<SessionPublic[]>("/v1/sessions?limit=6", { token });
  } catch (err: unknown) {
    if (err instanceof ApiError && err.status === 401) redirect("/login");
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-10 md:py-16">
        <HomeHero name={name} hasSessions={recent.length > 0} lastSessionId={recent[0]?.id} />
        <RecentSessions sessions={recent} />
      </div>
    </div>
  );
}
