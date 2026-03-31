import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "NOAH Kort",
  description: "Find NOAHs afdelinger og grupper på kortet",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da" className={roboto.variable}>
      <body className={`${roboto.className} antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
