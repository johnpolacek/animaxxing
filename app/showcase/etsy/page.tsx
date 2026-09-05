import type { Metadata } from "next";
import { ShowcaseNav } from "../ShowcaseNav";
import { Made } from "./Made";

export const metadata: Metadata = {
  title: "Browse — Made",
  description:
    "A handmade marketplace, animaxxed: browse, item, shop, and cart, with the photograph as the hero, set in monochrome and in motion.",
};

export default function EtsyPage() {
  return (
    <main id="top" className="flex flex-1 flex-col">
      {/* The photographs bleed past the grid on purpose; the clip keeps them from widening the page. */}
      <section className="overflow-x-clip px-gutter pt-10 pb-16 sm:px-gutter-lg">
        <div className="mx-auto w-full max-w-7xl">
          <ShowcaseNav slug="etsy" />
          <Made />
        </div>
      </section>
    </main>
  );
}
