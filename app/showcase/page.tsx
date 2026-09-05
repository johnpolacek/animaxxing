import type { Metadata } from "next";
import Link from "next/link";
import { Annotation, Statement } from "@/components/ui";
import { DEMOS } from "./demos";
import { ParticleCard } from "./ParticleCard";

export const metadata: Metadata = {
  title: "Showcase — Animaxxing",
  description: "Well-known sites, redesigned and animated to the max.",
};

export default function Showcase() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="px-gutter pt-10 pb-16 sm:px-gutter-lg">
        <div className="mx-auto w-full max-w-7xl">
          <Statement as="h1" data-page-transition="letters">
            Showcase
          </Statement>
          <div data-page-transition className="mt-6">
            <Annotation>Sites you know, animaxxed. Pick one.</Annotation>
          </div>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Demos">
            {DEMOS.map((demo, index) => (
              <li key={demo.slug}>
                <ParticleCard demo={demo} index={index} />
              </li>
            ))}
          </ul>
          <div data-page-transition className="mt-8 sm:mt-12">
            <Link
              href="/animaxx"
              className="inline-flex items-center rounded-lg bg-inverse px-5 py-2.5 font-sans text-3xl font-extrabold uppercase tracking-[-0.02em] text-inverse-foreground transition-colors hover:bg-inverse-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus sm:px-8 sm:py-4 sm:text-5xl"
            >
              Get Animaxxed
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
