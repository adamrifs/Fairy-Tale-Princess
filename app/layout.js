import { Cormorant_Garamond, EB_Garamond, Cinzel } from "next/font/google";
import { RootProviders } from "@/providers";
import { BGMPlayer } from "@/components/audio/BGMPlayer";
import "./globals.css";

// next/font self-hosts and subsets at build time — no runtime request to
// Google Fonts, no layout shift from a late-arriving stylesheet.
const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata = {
  title: "A Fairy Tale — A Cinematic Story",
  description:
    "An immersive, cinematic retelling of a classic fairy tale — told through scroll, sound, and light.",
};

export const viewport = {
  themeColor: "#0B1246",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${cormorantGaramond.variable} ${ebGaramond.variable} ${cinzel.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-white font-sans text-moon-white antialiased">
        <RootProviders>{children}</RootProviders>
        <BGMPlayer />
      </body>
    </html>
  );
}
