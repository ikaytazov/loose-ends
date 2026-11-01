import type { Metadata } from "next";
import { Figtree, Newsreader } from "next/font/google";
import "./globals.css";

// Brand fonts. next/font downloads them at build time, so builds need access to Google Fonts (Vercel has it).
const newsreader = Newsreader({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-newsreader", display: "swap" });
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-figtree", display: "swap" });

export const metadata: Metadata = {
  title: "Loose Ends",
  description: "The follow-up assistant for startup teams",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${newsreader.variable} ${figtree.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
