import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "SO — ZEMA TECHNOLOGIES", description: "SO by ZEMA TECHNOLOGIES — AI Growth Agent" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
