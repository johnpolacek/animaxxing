import type { Metadata } from "next";
import { ShowcaseNav } from "../ShowcaseNav";
import { Article } from "./Article";

export const metadata: Metadata = {
  title: "Octopus — Animaxxipedia",
  description: "Wikipedia's Octopus article, animaxxed: the same structure, set in monochrome and in motion.",
};

export default function Animaxxipedia() {
  return (
    <main id="top" className="flex flex-1 flex-col">
      {/* Ink drifts past the grid on purpose; clip keeps it from widening the page. */}
      <section className="overflow-x-clip px-gutter pt-10 pb-16 sm:px-gutter-lg">
        <div className="mx-auto w-full max-w-7xl">
          <ShowcaseNav slug="animaxxipedia" />
          <Article />
        </div>
      </section>
    </main>
  );
}
