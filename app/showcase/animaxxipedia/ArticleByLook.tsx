"use client";

import { useLook } from "@/components/theme/LookProvider";
import { Article } from "./Article";
import { BauhausArticle } from "./BauhausArticle";
import { CinematicArticle } from "./CinematicArticle";
import { ConstructivistArticle } from "./ConstructivistArticle";

/** The article composes differently under each look; pick the one for the look in force. */
export function ArticleByLook() {
  const look = useLook();
  switch (look) {
    case "cinematic":
      return <CinematicArticle />;
    case "bauhaus":
      return <BauhausArticle />;
    case "constructivist":
      return <ConstructivistArticle />;
    default:
      return <Article />;
  }
}
