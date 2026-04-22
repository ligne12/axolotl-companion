import { AlertCircle, Check, Info, TriangleAlert } from "lucide-react";
import type { Metadata, Viewport } from "next";
import { Inter, Pixelify_Sans } from "next/font/google";
import { Toaster } from "sonner";

import { AppBackground } from "@/components/layout/app-background";
import { GlobalClickSpark } from "@/components/layout/global-click-spark";
import { QueryProvider } from "@/components/providers/query-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const pixelify = Pixelify_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "700"],
  variable: "--font-pixel",
});

export const metadata: Metadata = {
  title: "Axolotl Companion",
  description: "Local-first AI companion with an animated mascot",
  applicationName: "Axolotl Companion",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f2e6" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1610" },
  ],
};

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`h-dvh ${inter.variable} ${pixelify.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap"
        />
      </head>
      <body className="h-dvh overflow-hidden bg-background text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppBackground />
          <SessionProvider>
            <QueryProvider>
              <GlobalClickSpark>
                {children}
              </GlobalClickSpark>
              <Toaster
                position="top-right"
                offset={16}
                gap={10}
                icons={{
                  success: (
                    <Check
                      className="size-4 text-[color:var(--lime)]"
                      strokeWidth={3}
                    />
                  ),
                  error: (
                    <AlertCircle className="size-4 text-[color:var(--destructive)]" />
                  ),
                  info: <Info className="size-4 text-muted-foreground" />,
                  warning: (
                    <TriangleAlert className="size-4 text-[color:var(--lime)]" />
                  ),
                }}
                toastOptions={{
                  classNames: {
                    toast:
                      "!border-2 !border-border !bg-card !text-foreground !rounded-md !shadow-[3px_3px_0_0_var(--border)] !font-sans !p-3.5 !gap-3",
                    title: "!text-sm !leading-5",
                    description: "!text-xs !text-muted-foreground !mt-0.5",
                    success: "!shadow-[3px_3px_0_0_var(--lime)]",
                    error: "!shadow-[3px_3px_0_0_var(--destructive)]",
                    warning: "!shadow-[3px_3px_0_0_var(--lime)]",
                    info: "!shadow-[3px_3px_0_0_var(--border)]",
                    actionButton:
                      "!border-2 !border-border !bg-card !text-foreground !rounded-md !shadow-[2px_2px_0_0_var(--border)] !text-xs !px-2 !py-1 !font-pixel !uppercase !tracking-[0.12em]",
                    cancelButton: "!text-xs !text-muted-foreground",
                    closeButton:
                      "!border-2 !border-border !bg-card !text-foreground !rounded-md",
                  },
                }}
              />
            </QueryProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
