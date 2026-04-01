import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BRIEFING",
  description: "Your personalized daily news briefing",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
