import type { Metadata } from "next";
import { ShowcaseNav } from "../ShowcaseNav";
import { Repo } from "./Repo";

export const metadata: Metadata = {
  title: "Overview — Repo",
  description:
    "A GitHub repository page, animaxxed: sindresorhus/awesome, set in monochrome on a strict grid.",
};

export default function GitHubPage() {
  return (
    <main id="top" className="flex flex-1 flex-col">
      <section className="px-gutter pt-10 pb-16 sm:px-gutter-lg">
        <div className="mx-auto w-full max-w-7xl">
          <ShowcaseNav slug="github" />
          <Repo />
        </div>
      </section>
    </main>
  );
}
