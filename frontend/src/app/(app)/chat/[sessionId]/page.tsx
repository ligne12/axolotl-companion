import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { ChatWindow } from "@/components/chat/chat-window";
import { apiFetch, ApiError } from "@/lib/api";
import type { SessionDetail } from "@/types/api";

export default async function ChatSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId: sid } = await params;
  const sessionId = Number(sid);
  if (!Number.isFinite(sessionId)) notFound();

  const session = await auth();
  if (!session?.accessToken || session.error === "RefreshAccessTokenError") {
    redirect("/login");
  }
  const token = session.accessToken;

  let detail: SessionDetail;
  try {
    detail = await apiFetch<SessionDetail>(`/v1/sessions/${sessionId}`, { token });
  } catch (err: unknown) {
    if (err instanceof ApiError && err.status === 404) notFound();
    if (err instanceof ApiError && err.status === 401) redirect("/login");
    throw err;
  }

  return (
    <ChatWindow
      sessionId={sessionId}
      initialMessages={detail.messages}
      token={token}
    />
  );
}
