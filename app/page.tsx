import type { Metadata } from "next";
import { HomeHero } from "./HomeHero";

export const metadata: Metadata = {
  title: "Animaxxing",
  description:
    "Get agents to animate the shit out of your website.",
};

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="px-gutter pt-6 pb-10 sm:px-gutter-lg sm:pt-10 sm:pb-16">
        <div className="mx-auto w-full max-w-7xl">
          <HomeHero />
        </div>
      </section>
    </main>
  );
}
