import type { Metadata } from "next";
import { ShowcaseNav } from "../ShowcaseNav";
import { Board } from "./Board";

export const metadata: Metadata = {
  title: "Board — The List",
  description:
    "Craigslist's San Francisco board, animaxxed: nine sections, set in monochrome on a strict grid.",
};

export default function CraigslistPage() {
  return (
    <main id="top" className="flex flex-1 flex-col">
      {/* The photograph bleeds past the grid on purpose; the clip keeps it from widening the page. */}
      <section className="overflow-x-clip px-gutter pt-10 pb-16 sm:px-gutter-lg">
        <div className="mx-auto w-full max-w-7xl">
          <ShowcaseNav slug="craigslist" />
          <Board />
        </div>
      </section>
    </main>
  );
}
