import type { Metadata } from "next";
import "@fontsource/wire-one/400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "世界線探測儀｜Divergence Meter",
  description: "以數字管觀測此刻時間，並探測屬於你的每日世界線變動率。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
