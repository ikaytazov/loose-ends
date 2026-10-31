import type { Metadata } from "next";
import "./globals.css";

// Fonts: no next/font/google here on purpose. Cloud Claude Code sessions cannot reach Google Fonts,
// so builds there would fail. To use the mockup font, put the font files in the repo and use next/font/local.

export const metadata: Metadata = {
  title: "Loose Ends",
  description: "The follow-up assistant for startup teams",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
