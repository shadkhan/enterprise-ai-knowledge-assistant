import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Enterprise AI Knowledge Assistant",
  description: "Reference implementation skeleton for secure enterprise RAG.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

