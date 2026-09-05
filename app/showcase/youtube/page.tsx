import type { Metadata } from "next";
import { ShowcaseNav } from "../ShowcaseNav";
import { Tube } from "./Tube";

export const metadata: Metadata = {
  title: "Feed — Tube",
  description:
    "A video site, animaxxed: the feed, the player, a channel, and search, every video a strict 16:9 frame of monochrome footage.",
};

export default function YouTubePage() {
  return (
    <main id="top" className="flex flex-1 flex-col">
      <section className="px-gutter pt-10 pb-16 sm:px-gutter-lg">
        <div className="mx-auto w-full max-w-7xl">
          <ShowcaseNav slug="youtube" />
          <Tube />
        </div>
      </section>
    </main>
  );
}
