import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { SearchProvider } from "@/lib/search-context";
import { PwaInit } from "./pwa-init";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
});

const APP_NAME = "NOAH Kort";
const APP_DESCRIPTION = "Find NOAHs afdelinger og grupper på kortet";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s — ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#00ae5a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da" className={roboto.variable}>
      <body className={`${roboto.className} antialiased`}>
        <PwaInit />
        <SearchProvider>
          <AppShell>{children}</AppShell>
        </SearchProvider>
      </body>
    </html>
  );
}
