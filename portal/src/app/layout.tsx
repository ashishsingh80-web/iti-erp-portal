import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Space_Grotesk } from "next/font/google";
import { AppHeader } from "@/components/header/app-header";
import { Sidebar } from "@/components/sidebar";
import { SidebarDrawer } from "@/components/sidebar-drawer";
import { ToastHost } from "@/components/ui/toast-host";
import { getCurrentUser } from "@/lib/auth";
import { readAppLanguage } from "@/lib/i18n-server";
import { getSidebarQueueBadges } from "@/lib/services/dashboard-service";
import { readSessionConfig } from "@/lib/session-config";
import "./globals.css";
import { CsrfFetchWrapper } from "@/components/security/csrf-fetch-wrapper";
import { AppSerwistProvider } from "@/components/serwist-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });

export const metadata: Metadata = {
  title: "ITI ERP Portal",
  description: "Custom admissions portal for ITI ERP",
  applicationName: "ITI ERP Portal",
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/icons/icon-192.png"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ITI ERP"
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#06281f" }
  ]
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await getCurrentUser();
  const [sessionConfig, lang, sidebarBadgeMetrics] = await Promise.all([
    user ? readSessionConfig() : Promise.resolve(null),
    readAppLanguage(),
    user ? getSidebarQueueBadges() : Promise.resolve([])
  ]);
  const sidebarBadges = Object.fromEntries(
    sidebarBadgeMetrics.map((item) => [item.label, item.value])
  ) as Record<string, string>;

  return (
    <html lang={lang === "hi" ? "hi" : "en"}>
      <body suppressHydrationWarning className={`${inter.variable} ${space.variable} font-sans`}>
        <AppSerwistProvider>
          <CsrfFetchWrapper />
        {user ? (
          <>
            <div className="mx-auto grid min-h-screen max-w-[1700px] items-start gap-6 px-4 py-6 print:block print:max-w-none print:px-0 print:py-0 md:grid-cols-[320px_minmax(0,1fr)] md:px-6">
              <div className="hidden min-h-0 md:-my-6 md:block md:self-start">
                <Sidebar badges={sidebarBadges} className="md:top-0 md:h-[100dvh] md:max-h-[100dvh]" lang={lang} user={user} />
              </div>
              <main className="space-y-6 overflow-visible print:space-y-0">
                <div className="md:hidden">
                  <SidebarDrawer badges={sidebarBadges} lang={lang} user={user} />
                </div>
                {sessionConfig ? <AppHeader lang={lang} sessionConfig={sessionConfig} user={user} /> : null}
                {children}
              </main>
            </div>
            <ToastHost />
          </>
        ) : (
          <>
            {children}
            <ToastHost />
          </>
        )}
        </AppSerwistProvider>
      </body>
    </html>
  );
}
