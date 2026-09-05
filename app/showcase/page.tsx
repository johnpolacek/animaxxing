import type { Metadata } from "next";
import { Annotation, Statement } from "@/components/ui";
import { DEMOS } from "./demos";
import { ParticleCard } from "./ParticleCard";
import { ShowcaseCTA } from "./ShowcaseCTA";

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
          <ShowcaseCTA />
        </div>
      </section>
    </main>
  );
}
