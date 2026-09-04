import { BodyCopy, Label } from "@/components/ui";
import type { Aesthetic } from "./aesthetics";

/*
 * One aesthetic, as a hairline-ruled row: its number and name, what it looks
 * like, and where its skill lives. It takes part in the route
 * transition like any other page item.
 */
const READ = "font-mono text-annotation uppercase text-foreground";

export function AestheticRow({ aesthetic, index }: { aesthetic: Aesthetic; index: number }) {
  const number = String(index + 1).padStart(2, "0");
  return (
    <li data-page-transition className="grid gap-4 border-t border-border py-6 sm:grid-cols-12 sm:gap-6">
      <div className="flex items-baseline justify-between gap-4 sm:col-span-3 sm:block">
        <Label as="h3" className="text-foreground">
          {number} · {aesthetic.name}
        </Label>
        {!aesthetic.ready && <Label className="sm:mt-2 sm:block">Soon</Label>}
      </div>
      <BodyCopy className="text-muted sm:col-span-6">{aesthetic.blurb}</BodyCopy>
      <div className="flex items-center sm:col-span-3 sm:justify-end">
        {aesthetic.ready && aesthetic.href && (
          <a href={aesthetic.href} className={READ}>
            Read it →
          </a>
        )}
      </div>
    </li>
  );
}
