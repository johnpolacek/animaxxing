"use client";

import { useLook } from "@/components/theme/LookProvider";
import { CinematicHero } from "./CinematicHero";
import { Hero } from "./Hero";

/** The front door composes differently under each look; pick the hero for the one in force. */
export function HomeHero() {
  const look = useLook();
  return look === "cinematic" ? <CinematicHero /> : <Hero />;
}
