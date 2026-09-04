import type { Metadata } from "next";
import { ShowcaseNav } from "../ShowcaseNav";
import { FrontPage } from "./FrontPage";

export const metadata: Metadata = {
  title: "Front — The Feed",
  description: "Hacker News's front page, animaxxed: the ranked list, set in monochrome on a strict grid.",
};

export default function HackerNewsPage() {
  return (
    <main id="top" className="flex flex-1 flex-col">
      <section className="px-gutter pt-10 pb-16 sm:px-gutter-lg">
        <div className="mx-auto w-full max-w-7xl">
          <ShowcaseNav slug="hackernews" />
          <FrontPage />
        </div>
      </section>
    </main>
  );
}
