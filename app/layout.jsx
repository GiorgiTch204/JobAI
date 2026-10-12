import { Suspense } from "react";

import "./globals.css";

import BootLoader from "@/components/loader/BootLoader";
import { RouteProgress } from "@/components/loader/RouteProgress";
import { ThemeScript } from "@/components/providers/ThemeScript";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = {
  title: {
    default: "JobAI — read your CV the way an ATS does",
    template: "%s · JobAI",
  },
  description:
    "JobAI parses your CV, scores it against the checks applicant tracking systems run, and shows which keywords each job post wants that your CV does not mention yet.",
  applicationName: "JobAI",
  keywords: ["CV", "resume", "ATS", "job search", "keyword match"],
  authors: [{ name: "JobAI" }],
  openGraph: {
    title: "JobAI — read your CV the way an ATS does",
    description:
      "Score your CV against real ATS checks and see the keywords each job post is screening for.",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eceff3" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0f16" },
  ],
};

export default async function RootLayout({ children }) {
  // The server already knows who is signed in, so the client context starts
  // populated instead of flashing a signed-out header on first paint.
  const user = await getCurrentUser();

  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <BootLoader />
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>

        <ThemeProvider>
          <AuthProvider initialUser={user}>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
