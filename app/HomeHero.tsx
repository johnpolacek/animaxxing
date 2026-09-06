"use client";

import { useLook } from "@/components/theme/LookProvider";
import { BauhausHero } from "./BauhausHero";
import { CinematicHero } from "./CinematicHero";
import { ConstructivistHero } from "./ConstructivistHero";
import { Hero } from "./Hero";
import { PinnedHero } from "./PinnedHero";

/** The front door composes differently under each look; pick the hero for the one in force. */
export function HomeHero() {
  const look = useLook();
  switch (look) {
    case "cinematic":
      return <CinematicHero />;
    case "bauhaus":
      return <BauhausHero />;
    case "constructivist":
      return <ConstructivistHero />;
    case "pinned":
      return <PinnedHero />;
    default:
      return <Hero />;
  }
}
