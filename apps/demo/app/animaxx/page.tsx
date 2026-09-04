import type { Metadata } from "next";
import { Annotation, Statement } from "@/components/ui";
import { Animaxx } from "./Animaxx";

export const metadata: Metadata = {
  title: "Get Animaxxed — Animaxxing",
  description: "Enter a website. We'll animate the shit out of it.",
};

export default function GetAnimaxxed() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="px-gutter pt-10 pb-16 sm:px-gutter-lg">
        <div className="mx-auto w-full max-w-7xl">
          <Statement as="h1" data-page-transition="letters">
            Get Animaxxed
          </Statement>
          <Annotation as="p" data-page-transition="letters-sides" className="mt-6 max-w-none!">
            Enter a website. We&rsquo;ll animate the shit out of it.
          </Annotation>
          <Animaxx />
        </div>
      </section>
    </main>
  );
}
