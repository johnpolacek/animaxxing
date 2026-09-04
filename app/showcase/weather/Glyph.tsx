import type { SVGProps } from "react";
import type { Condition } from "./content";

/*
 * Weather as line drawings.
 *
 * One stroke weight, no fills: a circle for the sun, an outline for cloud,
 * hairlines for fog, diagonal hairlines for rain, a zigzag for lightning.
 * Every stroked shape is tagged `data-stroke`, so the page can measure it and
 * draw it in along its own length. `vector-effect` keeps the weight the same
 * at every size the glyph is used.
 */

type Props = Omit<SVGProps<SVGSVGElement>, "children"> & {
  condition: Condition;
  /** Short description for assistive technology. Omit for purely decorative uses. */
  label?: string;
};

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  vectorEffect: "non-scaling-stroke",
} as const;

/** Sun: a circle and eight short rays. */
function Sun({ cx = 24, cy = 24, r = 8, rays = true }: { cx?: number; cy?: number; r?: number; rays?: boolean }) {
  const inner = r + 4.5;
  const outer = r + 8.5;
  return (
    <>
      <circle data-stroke cx={cx} cy={cy} r={r} {...STROKE} />
      {rays
        ? Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            const c = Math.cos(a);
            const s = Math.sin(a);
            return (
              <line
                data-stroke
                data-ray
                key={i}
                x1={cx + c * inner}
                y1={cy + s * inner}
                x2={cx + c * outer}
                y2={cy + s * outer}
                {...STROKE}
              />
            );
          })
        : null}
    </>
  );
}

const CLOUD =
  "M15.5 34.5h18.5a6.5 6.5 0 0 0 .9-12.94A9.5 9.5 0 0 0 16.6 19.2 7.7 7.7 0 0 0 15.5 34.5z";

function Cloud({ y = 0, occlude = false }: { y?: number; occlude?: boolean }) {
  return (
    <path
      data-stroke
      d={CLOUD}
      transform={y ? `translate(0 ${y})` : undefined}
      {...STROKE}
      className={occlude ? "fill-canvas" : undefined}
    />
  );
}

export function Glyph({ condition, label, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 48 48"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-glyph={condition}
      {...rest}
    >
      {condition === "sun" ? <Sun /> : null}
      {condition === "partly" ? (
        <>
          <Sun cx={29} cy={18} r={6.5} />
          <Cloud y={3} occlude />
        </>
      ) : null}
      {condition === "cloud" ? <Cloud /> : null}
      {condition === "fog" ? (
        <>
          <Cloud y={-6} />
          <line data-stroke x1={12} y1={35} x2={34} y2={35} {...STROKE} />
          <line data-stroke x1={16} y1={41} x2={38} y2={41} {...STROKE} />
        </>
      ) : null}
      {condition === "rain" ? (
        <>
          <Cloud y={-7} />
          <line data-stroke x1={17} y1={33} x2={13} y2={42} {...STROKE} />
          <line data-stroke x1={25} y1={33} x2={21} y2={42} {...STROKE} />
          <line data-stroke x1={33} y1={33} x2={29} y2={42} {...STROKE} />
        </>
      ) : null}
      {condition === "storm" ? (
        <>
          <Cloud y={-7} />
          <path data-stroke data-bolt d="M26 31l-5 7.5h7l-5 8" {...STROKE} />
        </>
      ) : null}
    </svg>
  );
}

/** A compass arrow. Rotate it to the direction the wind comes from. */
export function WindArrow(props: Omit<SVGProps<SVGSVGElement>, "children">) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
      <line data-stroke x1={24} y1={40} x2={24} y2={9} {...STROKE} />
      <path data-stroke d="M16 17l8-8 8 8" {...STROKE} />
    </svg>
  );
}
