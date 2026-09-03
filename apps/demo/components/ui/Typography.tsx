import type { ElementType, HTMLAttributes, ReactNode } from "react";

/*
 * Typographic roles, not layouts.
 *
 * Headings and display type use `font-extrabold` (800), which is the top of
 * Rethink Sans's variable `wght` axis (400–800). Asking for 900 clamps to the
 * same rendering, so the system names the weight it actually gets.
 *
 * The International Typographic Style contrast this system runs on is between
 * oversized Rethink Sans statements and compact supporting copy. These four
 * roles name that contrast so compositions can be assembled from them without
 * a hero component baking one arrangement in.
 *
 * Everything is flush left and ragged right. Justified text and centred blocks
 * are not part of the system: they weaken the alignment edge the grid depends
 * on.
 */

type TypeProps = {
  as?: ElementType;
  className?: string;
  children: ReactNode;
};

/**
 * `muted` is the default supporting voice on canvas and surface. `inverse` is
 * its counterpart on an inverted band, where the muted gray would fall below
 * AA against the dark fill.
 */
export type SupportTone = "muted" | "inverse";

const SUPPORT_TONE: Record<SupportTone, string> = {
  muted: "text-muted",
  inverse: "text-inverse-foreground/75",
};

/**
 * Poster scale: a structural graphic element. Fluid to its container, with
 * tight leading, so it can span columns or be cropped at a deliberate
 * boundary. Never use it for text that must be read in full — see
 * {@link Annotation} and {@link BodyCopy} for that.
 */
export function Poster({
  as: Component = "p",
  /** Pulls the left side-bearing off so the glyph edge, not the box, aligns to the grid. */
  trimLeft = false,
  className,
  children,
  ...rest
}: TypeProps & { trimLeft?: boolean } & HTMLAttributes<HTMLElement>) {
  return (
    <Component
      {...rest}
      className={[
        "font-sans text-poster font-extrabold text-balance",
        trimLeft ? "[margin-inline-start:-0.055em]" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Component>
  );
}

/**
 * Clips oversized type at a deliberate boundary instead of shrinking it. Only
 * ever wrap display type in this: small text must stay uncropped and readable
 * at every breakpoint.
 */
export function Crop({
  edge = "end",
  className,
  children,
}: {
  edge?: "end" | "start";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={["overflow-hidden", edge === "start" ? "flex justify-end" : "", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

/** One size down from poster: an oversized statement that still reads as a sentence. */
export function Statement({
  as: Component = "p",
  className,
  children,
  ...rest
}: TypeProps & HTMLAttributes<HTMLElement>) {
  return (
    <Component
      {...rest}
      className={["max-w-[18ch] font-sans text-statement font-extrabold text-balance", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Component>
  );
}

/**
 * Compact label: the metadata voice. Mono, uppercase, tracked out, and always
 * small — it anchors a grid cell rather than competing with it.
 */
export function Label({
  as: Component = "span",
  tone = "muted",
  className,
  children,
}: TypeProps & { tone?: SupportTone }) {
  return (
    <Component
      className={["font-mono text-caption uppercase", SUPPORT_TONE[tone], className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Component>
  );
}

/**
 * Margin annotation: the smallest type in the system. Kept above 11px and
 * never cropped, so it stays readable at every breakpoint.
 */
export function Annotation({
  as: Component = "p",
  tone = "muted",
  className,
  children,
}: TypeProps & { tone?: SupportTone }) {
  return (
    <Component
      className={["max-w-[46ch] font-mono text-annotation uppercase", SUPPORT_TONE[tone], className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Component>
  );
}

/** Small supporting body copy, held to a comfortable measure. */
export function BodyCopy({
  as: Component = "p",
  measure = "comfortable",
  className,
  children,
}: TypeProps & { measure?: "comfortable" | "narrow" }) {
  return (
    <Component
      className={[
        "font-sans text-body text-pretty",
        measure === "narrow" ? "max-w-[42ch]" : "max-w-[68ch]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Component>
  );
}
