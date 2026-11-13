import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppNav } from "@/components/shell/app-nav";
import { AmbientLayer } from "@/components/ui/ambient-layer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quipdeck",
  description:
    "A feed of short clips of unscripted wit: read the situation, flip the card, watch what was actually said.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  // Matches --surface-base (D-THEME-1).
  themeColor: "#0d0e11",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      style={{ colorScheme: "dark" }}
    >
      <head>
        <link rel="preconnect" href="https://www.youtube-nocookie.com" />
        <link rel="preconnect" href="https://www.youtube.com" />
      </head>
      <body className="min-h-full flex flex-col">
        <AmbientLayer />
        {children}
        <AppNav />
      </body>
    </html>
  );
}
