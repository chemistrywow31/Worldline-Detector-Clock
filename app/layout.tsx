import type { Metadata } from "next";
import "@fontsource/wire-one/400.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://divergence-meter.chemistrywilly310.chatgpt.site"),
  title: "未知世界線の命運石之門｜世界線探測儀",
  description: "以立體數字管觀測當地時間，並以 1.048596 為收束目標探測世界線運勢。",
  openGraph: {
    title: "未知世界線の命運石之門",
    description: "以 1.048596 為收束目標，觀測此刻的世界線。",
    type: "website",
    locale: "zh_TW",
    images: [{
      url: "/og.png",
      width: 1672,
      height: 941,
      alt: "未知世界線の命運石之門",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "未知世界線の命運石之門",
    description: "以 1.048596 為收束目標，觀測此刻的世界線。",
    images: ["/og.png"],
  },
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
