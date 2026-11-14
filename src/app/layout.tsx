import type { Metadata, Viewport } from "next";
import { DM_Sans, Space_Mono } from "next/font/google";
import "./globals.css";
import { AppNav } from "@/components/shell/app-nav";

// Soft Pop's fonts (REDESIGN_V2 section 3). DM Sans is variable (wght, opsz);
// Space Mono is not, so its two weights are listed.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  axes: ["opsz"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Quipdeck",
  description:
    "A feed of short clips of unscripted wit: read the situation, flip the card, watch what was actually said.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  // Matches the dark --background (D-THEME-1, D-THEME-8).
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${spaceMono.variable} dark h-full antialiased`}
      style={{ colorScheme: "dark" }}
    >
      <head>
        <link rel="preconnect" href="https://www.youtube-nocookie.com" />
        <link rel="preconnect" href="https://www.youtube.com" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <AppNav />
      </body>
    </html>
  );
}
