import { THEME_STORAGE_KEY } from "./theme";

/*
 * Applies the stored theme before first paint.
 *
 * This has to run synchronously in <head>: the server cannot know the choice,
 * so without it a pinned dark page renders one light frame first. Keep it
 * dependency-free and small — it is inlined into every document.
 */
const SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});document.documentElement.setAttribute("data-theme",t==="light"?"light":"dark")}catch(e){document.documentElement.setAttribute("data-theme","dark")}})()`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
