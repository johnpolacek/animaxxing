import type { Metadata } from "next";
import { ShowcaseNav } from "../ShowcaseNav";
import { FrontPage } from "./FrontPage";

export const metadata: Metadata = {
  title: "Feed — The Front Page",
  description: "Reddit's front page, animaxxed: the ranked feed, set in monochrome on a strict grid.",
};

export default function RedditPage() {
  return (
    <main id="top" className="flex flex-1 flex-col">
      {/* The photograph bleeds past the grid on purpose; the clip keeps it from widening the page. */}
      <section className="overflow-x-clip px-gutter pt-10 pb-16 sm:px-gutter-lg">
        <div className="mx-auto w-full max-w-7xl">
          <ShowcaseNav slug="reddit" />
          <FrontPage />
        </div>
      </section>
    </main>
  );
}
