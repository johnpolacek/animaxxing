import type { Metadata } from "next";
import { Barlow_Condensed, Cormorant_Garamond, Inter, JetBrains_Mono, Rethink_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { LOOK_COOKIE, lookFromCookie } from "@/components/theme/look";
import { LookProvider } from "@/components/theme/LookProvider";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { SiteShell } from "./SiteShell";
import "./globals.css";

/* Posterize, the default look. */
const rethinkSans = Rethink_Sans({
  variable: "--font-rethink-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

/*
 * Cinematic. These are declared for every page but not preloaded: the
 * browser only fetches a face once the look puts text in it.
 */
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  preload: false,
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  preload: false,
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["300", "400"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Animaxxing",
  description: "Motion to the Max.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The look decides how pages compose, so it has to be known before the
  // first byte; a cookie is the only store the server can read.
  const look = lookFromCookie((await cookies()).get(LOOK_COOKIE)?.value);
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      data-look={look}
      // The theme script sets data-theme before hydration; the server cannot
      // know the stored choice, so that attribute is expected to differ.
      suppressHydrationWarning
      className={`${rethinkSans.variable} ${jetbrainsMono.variable} ${cormorant.variable} ${inter.variable} ${barlowCondensed.variable} h-full scroll-smooth antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <LookProvider initial={look}>
          <SiteShell>{children}</SiteShell>
        </LookProvider>
      </body>
    </html>
  );
}
