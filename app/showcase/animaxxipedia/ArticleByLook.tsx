"use client";

import { useLook } from "@/components/theme/LookProvider";
import { Article } from "./Article";
import { CinematicArticle } from "./CinematicArticle";

/** The article composes differently under each look; pick the one for the look in force. */
export function ArticleByLook() {
  const look = useLook();
  return look === "cinematic" ? <CinematicArticle /> : <Article />;
}
