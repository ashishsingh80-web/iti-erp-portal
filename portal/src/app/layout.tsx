import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Space_Grotesk } from "next/font/google";
import { AppHeader } from "@/components/header/app-header";
import { Sidebar } from "@/components/sidebar";
import { SidebarDrawer } from "@/components/sidebar-drawer";
import { ToastHost } from "@/components/ui/toast-host";
import { getCurrentUser } from "@/lib/auth";
import { readAppLanguage } from "@/lib/i18n-server";
import { getDashboardMetrics } from "@/lib/services/dashboard-service";
import { readSessionConfig } from "@/lib/session-config";
import "./globals.css";
import { CsrfFetchWrapper } from "@/components/security/csrf-fetch-wrapper";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });

export const metadata: Metadata = {
  title: "ITI ERP Portal",
  description: "Custom admissions portal for ITI ERP",
  icons: {
    icon: "/portal-logo.png",
    apple: "/portal-logo.png"
  }
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await getCurrentUser();
  const sessionConfig = user ? await readSessionConfig() : null;
  const lang = await readAppLanguage();
  const sidebarBadgeMetrics = user ? await getDashboardMetrics() : [];
  const sidebarBadges = Object.fromEntries(
    sidebarBadgeMetrics.map((item) => [item.label, item.value])
  ) as Record<string, string>;

  return (
    <html lang={lang === "hi" ? "hi" : "en"}>
      <body suppressHydrationWarning className={`${inter.variable} ${space.variable} font-sans`}>
                <CsrfFetchWrapper />
        {user ? (
          <>
            <div className="mx-auto grid min-h-screen max-w-[1700px] items-start gap-6 px-4 py-6 print:block print:max-w-none print:px-0 print:py-0 md:grid-cols-[320px_minmax(0,1fr)] md:px-6">
              <div className="hidden md:block">
                <Sidebar badges={sidebarBadges} lang={lang} user={user} />
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
      </body>
    </html>
  );
}
