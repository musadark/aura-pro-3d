import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AURA PRO — Ближе к музыке",
  description: "AURA PRO. Концепт наушников: путешествие от тишины к звуку.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
