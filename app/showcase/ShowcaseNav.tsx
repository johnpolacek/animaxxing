import { ShowcaseBack } from "./ShowcaseBack";
import { ShowcaseNext } from "./ShowcaseNext";
import { ShowcaseReplay } from "./ShowcaseReplay";

/**
 * The row above every demo: the way back to the showcase on the left, and
 * on the right a replay of this demo and the way on to the next one. The
 * back link and the replay button take part in the route transition like any
 * other page item; the next button rides in on its own once the page has
 * settled.
 *
 * `slug` names the demo the row sits on. Left out, the next button reads it
 * from the URL.
 */
export function ShowcaseNav({ slug }: { slug?: string }) {
  return (
    <div className="mb-8 flex items-center justify-between gap-4">
      <ShowcaseBack />
      <div className="flex items-center gap-3">
        <ShowcaseReplay />
        <ShowcaseNext slug={slug} />
      </div>
    </div>
  );
}
