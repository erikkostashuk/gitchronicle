import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Public origin for canonical / OG URLs. Set APP_URL when deploying; Railway,
 * Render and Fly all expose their assigned domain, so fall back to those before
 * assuming local dev.
 */
function publicOrigin(): string {
  const explicit = process.env.APP_URL;
  if (explicit) return explicit.startsWith("http") ? explicit : `https://${explicit}`;
  const host = process.env.RAILWAY_PUBLIC_DOMAIN ?? process.env.RENDER_EXTERNAL_HOSTNAME;
  if (host) return `https://${host}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export const metadata: Metadata = {
  title: {
    default: "GitChronicle Wrapped",
    template: "%s · GitChronicle",
  },
  description:
    "Your repository had a year. Let’s replay it. Cinematic Git repository recap and engineering intelligence — no credentials required.",
  metadataBase: new URL(publicOrigin()),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-full bg-background font-sans text-foreground antialiased`}
      >
        <ThemeProvider>
          <TooltipProvider>
            {children}
            <Toaster richColors position="bottom-right" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
