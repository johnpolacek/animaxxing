import type { Metadata } from "next";
import { Hero } from "./Hero";

export const metadata: Metadata = {
  title: "Animaxxing",
  description:
    "Your static low rizz website is cooked. It has negative aura. Get your agents to animate the shit out of it.",
};

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="px-gutter pt-10 pb-16 sm:px-gutter-lg">
        <div className="mx-auto w-full max-w-7xl">
          <Hero />
        </div>
      </section>
    </main>
  );
}
