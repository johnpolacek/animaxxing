import type { Metadata } from "next";
import {
  Anton,
  Barlow_Condensed,
  Comic_Neue,
  Cormorant_Garamond,
  Courier_Prime,
  Inter,
  Inter_Tight,
  JetBrains_Mono,
  Jost,
  Luckiest_Guy,
  Nunito,
  Oswald,
  Rethink_Sans,
  Roboto_Condensed,
  Roboto_Mono,
  Space_Mono,
  VT323,
} from "next/font/google";
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

/* The typewriter face of a shooting script, for anything meant to be copied. */
const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  subsets: ["latin"],
  weight: ["400", "700"],
  preload: false,
});

/* Bauhaus. Jost is a Futura, the face the school's own printing settled on. */
const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "800"],
  preload: false,
});

/* A geometric monospace for the Bauhaus look's copyable text. */
const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  preload: false,
});

/*
 * Constructivist. Anton is the poster's wood type, Oswald its stencilled
 * captions, Roboto Condensed the small print, and Roboto Mono the wire.
 */
const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  preload: false,
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  preload: false,
});

const robotoCondensed = Roboto_Condensed({
  variable: "--font-roboto-condensed",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  style: ["normal", "italic"],
  preload: false,
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  preload: false,
});

/*
 * Pinned. Inter Tight is the keynote's display face, set extra bold and
 * tight; Inter, already loaded for cinematic, sets everything it explains.
 */
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  preload: false,
});

/* Early web. A stand-in for Comic Sans MS on machines that never had it. */
const comicNeue = Comic_Neue({
  variable: "--font-comic-neue",
  subsets: ["latin"],
  weight: ["400", "700"],
  preload: false,
});

/*
 * Strong Bad. Luckiest Guy is the sticker type every cartoon shouts in, VT323
 * is the phosphor inside the Compy 386, and Nunito, at 700 and 900, is the
 * voice that does the talking around them.
 */
const luckiestGuy = Luckiest_Guy({
  variable: "--font-luckiest-guy",
  subsets: ["latin"],
  weight: "400",
  preload: false,
});

const vt323 = VT323({
  variable: "--font-vt323",
  subsets: ["latin"],
  weight: "400",
  preload: false,
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
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
      className={`${rethinkSans.variable} ${jetbrainsMono.variable} ${cormorant.variable} ${inter.variable} ${barlowCondensed.variable} ${courierPrime.variable} ${jost.variable} ${spaceMono.variable} ${anton.variable} ${oswald.variable} ${robotoCondensed.variable} ${robotoMono.variable} ${interTight.variable} ${comicNeue.variable} ${luckiestGuy.variable} ${vt323.variable} ${nunito.variable} h-full scroll-smooth antialiased`}
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
