"use client";

import { useLook } from "@/components/theme/LookProvider";
import { BauhausHero } from "./BauhausHero";
import { CinematicHero } from "./CinematicHero";
import { ConstructivistHero } from "./ConstructivistHero";
import { EarlyWebHero } from "./EarlyWebHero";
import { Hero } from "./Hero";
import { PinnedHero } from "./PinnedHero";
import { StrongBadHero } from "./StrongBadHero";

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
    case "earlyweb":
      return <EarlyWebHero />;
    case "strongbad":
      return <StrongBadHero />;
    default:
      return <Hero />;
  }
}
