import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.error === "RefreshAccessTokenError") {
    redirect("/login");
  }
  return <AppShell>{children}</AppShell>;
}
