import type { Metadata } from "next";
import { JetBrains_Mono, Rethink_Sans } from "next/font/google";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { SiteShell } from "./SiteShell";
import "./globals.css";

const rethinkSans = Rethink_Sans({
  variable: "--font-rethink-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Animaxxing",
  description: "Motion to the Max.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      // The theme script sets data-theme before hydration; the server cannot
      // know the stored choice, so that attribute is expected to differ.
      suppressHydrationWarning
      className={`${rethinkSans.variable} ${jetbrainsMono.variable} h-full scroll-smooth antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
