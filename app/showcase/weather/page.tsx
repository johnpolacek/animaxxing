import type { Metadata } from "next";
import { ShowcaseNav } from "../ShowcaseNav";
import { Weather } from "./Weather";

export const metadata: Metadata = {
  title: "San Francisco, CA — Weather",
  description:
    "A weather site, animaxxed: current conditions, the hours, the week, and radar, set in monochrome and in motion.",
};

export default function WeatherPage() {
  return (
    <main id="top" className="flex flex-1 flex-col">
      {/* Rain and fog are allowed past the grid; the clip keeps them from widening the page. */}
      <section className="overflow-x-clip px-gutter pt-10 pb-16 sm:px-gutter-lg">
        <div className="mx-auto w-full max-w-7xl">
          <ShowcaseNav slug="weather" />
          <Weather />
        </div>
      </section>
    </main>
  );
}
