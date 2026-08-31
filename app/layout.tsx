import type { Metadata } from "next";
import "@fontsource/wire-one/400.css";
import "./globals.css";

export const dynamic = "force-static";

export const metadata: Metadata = {
  metadataBase: new URL("https://chemistry-wow.com"),
  title: "未知世界線のシュタインズ・ゲート｜世界線探測儀",
  description: "以立體數字管觀測當地時間，並以 1.048596 為收束目標探測世界線運勢。",
  openGraph: {
    title: "未知世界線のシュタインズ・ゲート",
    description: "以 1.048596 為收束目標，觀測此刻的世界線。",
    type: "website",
    locale: "zh_TW",
    images: [{
      url: "https://chemistry-wow.com/worldline-detector/og.png",
      width: 1672,
      height: 941,
      alt: "未知世界線のシュタインズ・ゲート",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "未知世界線のシュタインズ・ゲート",
    description: "以 1.048596 為收束目標，觀測此刻的世界線。",
    images: ["https://chemistry-wow.com/worldline-detector/og.png"],
  },
};

// Desktop wallpaper hosts (Plash, Lively, Wallpaper Engine) just load a URL, so
// `?wallpaper=1` flags the stripped-down view. The flag lands on <html> before
// first paint; leaving it to React would show the full page for a frame first.
const WALLPAPER_FLAG = `try {
  var value = new URLSearchParams(location.search).get("wallpaper");
  var on = (value !== null && value !== "0" && value !== "false") || location.hash === "#wallpaper";
  if (on) document.documentElement.dataset.wallpaper = "1";
} catch (error) {}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <head>
        <script dangerouslySetInnerHTML={{ __html: WALLPAPER_FLAG }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
