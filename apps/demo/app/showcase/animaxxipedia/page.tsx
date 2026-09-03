import type { Metadata } from "next";
import { Statement } from "@/components/ui";

export const metadata: Metadata = {
  title: "Animaxxipedia",
  description: "A Wikipedia article, animaxxed.",
};

export default function Animaxxipedia() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="px-gutter pt-10 pb-16 sm:px-gutter-lg">
        <div className="mx-auto w-full max-w-7xl">
          <Statement as="h1" data-page-transition>
            animaxxipedia
          </Statement>
        </div>
      </section>
    </main>
  );
}
