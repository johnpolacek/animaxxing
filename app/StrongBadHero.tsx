"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  gsap,
  navigateWithPageTransition,
  prefersReducedMotion,
  SplitText,
  useGSAP,
} from "@/components/motion";
import {
  bubbleIn,
  buttonPress,
  crtBoot,
  cursorBlink,
  deleted,
  punchIn,
  rumble,
  scanlineDrift,
  shake,
  slapDown,
  typeOut,
  wobble,
  type TypeRun,
} from "@/lib/animation/effects/strongbad";
import { watchPageTransition } from "@/lib/animation/pageState";

/*
 * The front door, Strong Bad.
 *
 * A cartoon: flat sky above, flat grass below, a black horizon between them
 * that the Compy 386 stands its desk on. The title is three stickers slapped
 * on one under the next, the pitch is something somebody said out of a white
 * bubble with a tail, and the two buttons are stuck on crooked. On the right
 * the Compy is showing an sbemail, and a pair of red boxing gloves sits on
 * the keyboard in front of it.
 *
 * Once the route reaches idle the whole thing arrives at once and nothing is
 * polite about it. The screen flashes on, the case springs up off the desk,
 * the gloves come up from under the keyboard and hit it, the kicker and the
 * three title lines are slapped down in turn hard enough to shake the stage,
 * the bubble grows out of its own tail and speaks a word at a time, and the
 * buttons are stuck on. Meanwhile the Compy types the email it was sent, at
 * the speed somebody types who is not Strong Bad, and then Strong Bad answers
 * it faster and the glove taps the keyboard once.
 *
 * After that it never settles: the cursor blinks, the scanlines creep, the
 * stickers rock, the gloves breathe, the scene leans toward the pointer, and
 * every nine seconds a glove hits the Compy for no reason at all.
 *
 * Pressing either button deletes the email: the screen blanks in flashes, a
 * white flare goes across the glass, DELETED!! is slammed onto it, both
 * gloves hit the keyboard and the title falls off the bottom of the page.
 * The route is handed off while the banner is still sitting there.
 */

type Action = "showcase" | "animaxx";
const HREF: Record<Action, string> = { showcase: "/showcase", animaxx: "/animaxx" };

/** Seconds into the DELETED gag at which the route swaps. */
const HANDOFF = 0.85;

/**
 * Characters per second. The Compy announces itself at machine speed, the
 * visitor's letter comes in at the speed of somebody typing on a 386, and
 * Strong Bad answers faster than either of them, because of course he does.
 */
const CPS = { head: 60, body: 34, reply: 45 };

/** Pixels the Compy leans toward the pointer. The title leans about half that. */
const LEAN = 6;

/*
 * Between the large breakpoint and the extra large one the buttons share a
 * column five elevenths of the page wide, which is not quite enough room for
 * them at full size; they come down a little there rather than stacking.
 */
const CTA_BASE =
  "inline-block cursor-pointer rounded-[14px] border-[3px] border-[var(--sb-ink)] px-6 pb-[10px] pt-[14px] text-center font-display text-[22px] leading-none text-[var(--sb-white)] shadow-[4px_4px_0_var(--sb-ink)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus sm:text-[24px] lg:px-4 lg:text-[21px] xl:px-6 xl:text-[24px]";

/**
 * The scene leans toward the pointer. Every layer carries its own `data-lean`
 * depth, so the Compy swings further than the title does and the two of them
 * read as standing at different distances. Returns the teardown.
 */
function lean(stage: HTMLElement, layers: HTMLElement[], travel: number): () => void {
  const movers = layers.map((layer) => ({
    depth: Number.parseFloat(layer.dataset.lean ?? "1"),
    x: gsap.quickTo(layer, "x", { duration: 0.9, ease: "power3.out" }),
    y: gsap.quickTo(layer, "y", { duration: 0.9, ease: "power3.out" }),
  }));
  const onMove = (event: PointerEvent) => {
    const bounds = stage.getBoundingClientRect();
    const nx = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const ny = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    for (const mover of movers) {
      mover.x(nx * travel * mover.depth);
      mover.y(ny * travel * mover.depth);
    }
  };
  const onLeave = () => {
    for (const mover of movers) {
      mover.x(0);
      mover.y(0);
    }
  };
  stage.addEventListener("pointermove", onMove);
  stage.addEventListener("pointerleave", onLeave);
  return () => {
    stage.removeEventListener("pointermove", onMove);
    stage.removeEventListener("pointerleave", onLeave);
    gsap.set(layers, { clearProps: "transform" });
  };
}

export function StrongBadHero() {
  const scope = useRef<HTMLDivElement>(null);
  const press = useRef<(action: Action) => void>(() => {});
  const router = useRouter();

  useEffect(() => {
    for (const href of Object.values(HREF)) {
      router.prefetch(href);
    }
  }, [router]);

  /*
   * Where the grass starts. The horizon has to land on the Compy's desk, and
   * the desk moves with the type above it, so the line is measured off the
   * case rather than guessed at as a percentage. `offsetTop` rather than a
   * bounding rect: the scene is under a transform once the pointer moves it,
   * and a rect would report the lean as well as the layout.
   */
  useEffect(() => {
    const root = scope.current;
    const stage = root?.querySelector<HTMLElement>("[data-stage]");
    const compy = root?.querySelector<HTMLElement>("[data-compy]");
    if (!stage || !compy) {
      return;
    }
    const measure = () => {
      let y = 0;
      let node: HTMLElement | null = compy;
      while (node && node !== stage) {
        y += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
      }
      // Half way down the desk's front edge, which hangs 26px below the case.
      stage.style.setProperty("--sb-horizon", `${Math.round(y + compy.offsetHeight + 13)}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    observer.observe(compy);
    return () => observer.disconnect();
  }, []);

  useGSAP(
    (_context, contextSafe) => {
      const root = scope.current;
      if (!root || !contextSafe) {
        return;
      }
      const q = gsap.utils.selector(root);
      const one = (selector: string) => q<HTMLElement>(selector)[0] ?? null;

      const hidden = q<HTMLElement>("[data-sb-intro]");
      const stage = one("[data-stage]");
      const compy = one("[data-compy]");
      const screen = one("[data-screen]");
      const crt = one("[data-crt]");
      const banner = one("[data-deleted]");
      const caret = one("[data-crt-cursor]");
      const keyboard = one("[data-keyboard]");
      const gloveLeft = one("[data-glove='left']");
      const gloveRight = one("[data-glove='right']");
      const bobs = q<HTMLElement>("[data-bob]");
      const kicker = one("[data-kick]");
      const lines = q<HTMLElement>("[data-line]");
      const bubble = one("[data-bubble]");
      const pitch = one("[data-pitch]");
      const shout = one("[data-shout]");
      const ctas = q<HTMLElement>("[data-cta]");
      const slaps = q<HTMLElement>("[data-cta-slap]");
      if (!stage || !compy || !screen || !crt) {
        return;
      }

      /* ------------------------------------------------- reduced motion */
      if (prefersReducedMotion()) {
        gsap.set(hidden, { autoAlpha: 1 });
        press.current = (action: Action) => navigateWithPageTransition(HREF[action]);
        return;
      }

      /* -------------------------------------------------- the machinery */
      let sequence: gsap.core.Timeline | null = null;
      let outro: gsap.core.Timeline | null = null;
      let departing = false;
      const loops: (gsap.core.Tween | gsap.core.Timeline)[] = [];
      const runs: TypeRun[] = [];
      const splits: SplitText[] = [];
      const teardowns: (() => void)[] = [];
      let unlean: (() => void) | null = null;
      // Everything a loop leaves an inline transform on, so the CSS tilt
      // underneath comes back the moment the loops are stopped.
      const rocked = [kicker, ...lines, ...bobs].filter(
        (el): el is HTMLElement => el instanceof HTMLElement,
      );

      /** Every loop stopped, every listener dropped, every split put back. */
      const settle = () => {
        unlean?.();
        unlean = null;
        for (const teardown of teardowns.splice(0)) {
          teardown();
        }
        for (const loop of loops.splice(0)) {
          loop.kill();
        }
        for (const run of runs.splice(0)) {
          run.revert();
        }
        for (const split of splits.splice(0)) {
          split.revert();
        }
        gsap.killTweensOf(rocked);
        gsap.set(rocked, { clearProps: "transform" });
      };

      /* ----------------------------------------------------- the outro */
      press.current = contextSafe((action: Action) => {
        if (outro) {
          return;
        }
        // Finish the intro where it stands, then take everything down: the
        // gag has to be the only thing moving on the page.
        sequence?.progress(1);
        settle();

        const tl = gsap.timeline();
        outro = tl;
        deleted(tl, crt, banner, 0, { screen });
        punchIn(tl, gloveLeft, keyboard, 0.08, { distance: 260, duration: 0.2, amount: 9 });
        punchIn(tl, gloveRight, null, 0.14, { distance: 260, duration: 0.2 });
        // The stickers come unstuck and drop off the bottom of the page.
        tl.to(
          lines,
          {
            y: () => window.innerHeight * 1.2,
            rotation: (index: number) => (index % 2 === 0 ? -24 : 28),
            duration: 0.5,
            ease: "power4.in",
            stagger: 0.07,
          },
          0.1,
        );
        tl.call(
          () => {
            departing = true;
            navigateWithPageTransition(HREF[action], { immediate: true });
          },
          undefined,
          HANDOFF,
        );
      });

      /* ------------------------------------------------------ the intro */
      const unwatch = watchPageTransition(root, {
        onIdle: contextSafe(() => {
          const tl = gsap.timeline();
          sequence = tl;
          tl.addLabel("boot", 0)
            .addLabel("title", 0.55)
            .addLabel("pitch", 1.35)
            .addLabel("cta", 2.1)
            .addLabel("loops", 2.75);

          /* --- the machine ------------------------------------------- */
          // The tube opens while the case springs up off the desk, and the
          // gloves arrive from under the keyboard hard enough to rattle it.
          crtBoot(tl, screen, "boot", { duration: 0.5 });
          bubbleIn(tl, compy, "boot", { origin: "50% 100%", rotate: -3, duration: 0.7 });
          bubbleIn(tl, keyboard, "boot+=0.12", { origin: "50% 100%", rotate: 0, duration: 0.5 });
          punchIn(tl, gloveLeft, keyboard, "boot+=0.3", { distance: 200, duration: 0.26, amount: 5 });
          punchIn(tl, gloveRight, null, "boot+=0.4", { distance: 200, duration: 0.26 });
          rumble(tl, compy, "boot+=0.56", { amount: 5, duration: 0.32 });

          /* --- the title --------------------------------------------- */
          slapDown(tl, kicker, "title", { from: 1.8, rotate: -12, duration: 0.3, shadow: "box" });
          // One line at a time, each landing off square in the other
          // direction, and the last one hits hard enough to move the camera.
          lines.forEach((line, index) => {
            slapDown(tl, line, `title+=${(0.2 + index * 0.12).toFixed(2)}`, {
              from: 2.2,
              rotate: index % 2 === 0 ? -9 : 7,
              duration: 0.32,
              shadow: "text",
            });
          });
          shake(tl, stage, "title+=0.76", { amount: 9, duration: 0.42 });

          /* --- the pitch --------------------------------------------- */
          bubbleIn(tl, bubble, "pitch", { origin: "100% 40%", rotate: 4, duration: 0.75 });
          if (pitch) {
            const split = SplitText.create(pitch, { type: "words", aria: "auto" });
            splits.push(split);
            tl.from(
              split.words,
              {
                autoAlpha: 0,
                y: 9,
                duration: 0.26,
                ease: "power2.out",
                stagger: 0.032,
              },
              "pitch+=0.22",
            );
          }
          slapDown(tl, shout, "pitch+=0.8", { from: 2, rotate: -6, duration: 0.3 });

          /* --- the buttons ------------------------------------------- */
          slaps.forEach((slap, index) => {
            slapDown(tl, slap, `cta+=${(index * 0.12).toFixed(2)}`, {
              from: 1.9,
              rotate: index % 2 === 0 ? -14 : 11,
              duration: 0.28,
            });
          });

          /* --- the email --------------------------------------------- */
          /*
           * The Compy's own line first and fast, then the letter at the
           * speed of somebody typing on a 386, a pause while Strong Bad
           * thinks about it, then the answer, quicker, behind a cursor. The
           * beats after it are measured off the characters themselves, so
           * the tap on the keyboard lands on the full stop.
           */
          const screenPlay = gsap.timeline();
          const headRun = typeOut(screenPlay, one("[data-crt-head]"), 0, { cps: CPS.head });
          const headEnd = (headRun?.chars.length ?? 0) / CPS.head;
          const bodyAt = headEnd + 0.2;
          const bodyRun = typeOut(screenPlay, one("[data-crt-body]"), bodyAt, { cps: CPS.body });
          const bodyEnd = bodyAt + (bodyRun?.chars.length ?? 0) / CPS.body;
          const replyAt = bodyEnd + 0.55;
          // The cursor arrives with Strong Bad's answer, not before it.
          screenPlay.set(caret, { autoAlpha: 1 }, replyAt);
          const replyRun = typeOut(screenPlay, one("[data-crt-reply]"), replyAt, {
            cps: CPS.reply,
            cursor: caret,
          });
          const replyEnd = replyAt + (replyRun?.chars.length ?? 0) / CPS.reply;
          for (const run of [headRun, bodyRun, replyRun]) {
            if (run) {
              runs.push(run);
            }
          }
          // Answered. The glove taps the key that sent it and the text jumps.
          punchIn(screenPlay, gloveLeft, null, replyEnd + 0.1, { distance: 44, duration: 0.16 });
          rumble(screenPlay, crt, replyEnd + 0.24, { amount: 3, duration: 0.26 });
          screenPlay.call(
            () => {
              const blink = cursorBlink(caret);
              if (blink) {
                loops.push(blink);
              }
            },
            undefined,
            replyEnd + 0.4,
          );
          tl.add(screenPlay, "boot+=0.6");

          /* --- and then it never stops -------------------------------- */
          tl.call(
            () => {
              const drift = scanlineDrift(screen);
              if (drift) {
                loops.push(drift);
              }
              // Tiny angles on different clocks: a row of stickers rocking
              // in step would read as one sticker drawn four times.
              const kick = wobble(kicker, { angle: 1.4, duration: 3.4 });
              if (kick) {
                loops.push(kick);
              }
              lines.forEach((line, index) => {
                const rock = wobble(line, { angle: 0.7 + index * 0.25, duration: 2.5 + index * 0.6 });
                if (rock) {
                  loops.push(rock);
                }
              });
              // The gloves breathe.
              loops.push(
                gsap.fromTo(
                  bobs,
                  { y: 3 },
                  {
                    y: -3,
                    duration: 1.7,
                    ease: "sine.inOut",
                    repeat: -1,
                    yoyo: true,
                    stagger: 0.45,
                  },
                ),
              );
              // And every nine seconds the right one hits the Compy for no
              // reason, and the email jumps on the glass.
              const idle = gsap.timeline({ repeat: -1, repeatDelay: 9, delay: 9 });
              punchIn(idle, gloveRight, null, 0, { distance: 52, duration: 0.18 });
              rumble(idle, crt, 0.2, { amount: 3, duration: 0.3 });
              loops.push(idle);

              teardowns.push(buttonPress(ctas));
              unlean = lean(stage, q<HTMLElement>("[data-lean]"), LEAN);
            },
            undefined,
            "loops",
          );
        }),
        onExiting: () => {
          if (departing) {
            return;
          }
          sequence?.kill();
          sequence = null;
          settle();
        },
      });

      return () => {
        unwatch();
        sequence?.kill();
        outro?.kill();
        settle();
      };
    },
    { scope },
  );

  return (
    <div ref={scope}>
      <div data-page-transition data-stage className="relative">
        {/*
         * The grass. It is a band rather than a page background because the
         * horizon has to meet the Compy's desk wherever that lands, and the
         * shadow under it carries the green on down past the fold to the
         * footer without putting a single pixel of height into the page. The
         * offset and the spread are equal, which puts the top edge of the
         * shadow exactly on the top edge of the band: one continuous field of
         * green with no seam in it, whatever height the band works out to.
         */}
        <i
          aria-hidden="true"
          data-ground
          className="pointer-events-none absolute bottom-0 left-1/2 block w-screen -translate-x-1/2 bg-[var(--sb-grass)]"
          style={{ top: "var(--sb-horizon, 62%)", boxShadow: "0 900px 0 900px var(--sb-grass)" }}
        >
          <i className="sb-bar absolute inset-x-0 -top-[3px] block" />
        </i>

        <div className="relative grid items-start gap-x-6 lg:grid-cols-[5fr_6fr] lg:grid-rows-[auto_auto_1fr]">
          {/* ------------------------------------------------- the title */}
          <div data-lean="0.55" className="lg:col-start-1 lg:row-start-1">
            <span data-kick data-sb-intro className="inline-block">
              <span className="sb-kick block [transform:rotate(-2deg)]">
                Agent skills for GSAP · sbemail #1337
              </span>
            </span>
            {/* Two clamps, because the title has the page to itself until the
                Compy comes alongside it at the large breakpoint. */}
            <h1 className="sb-sticker m-0 mt-4 font-display text-[clamp(4.5rem,12.5vw,7rem)] leading-[0.86] [--sb-sticker-drop:0.05em] [--sb-sticker-stroke:0.024em] lg:text-[clamp(4.5rem,8.6vw,8rem)]">
              <span data-line data-sb-intro className="block text-[var(--sb-yellow)]">
                Motion
              </span>
              <span data-line data-sb-intro className="block pl-[0.3em] text-[var(--sb-white)]">
                to the
              </span>
              <span data-line data-sb-intro className="block text-[var(--sb-red)]">
                Max!
              </span>
            </h1>
          </div>

          {/* -------------------------------------------------- the compy */}
          <div
            data-desk
            data-lean="1"
            className="relative mt-10 flex flex-col items-center lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:mt-0 lg:self-center"
          >
            <div data-compy data-sb-intro className="relative w-[min(640px,100%)]">
              {/* The front edge of the desk, sitting on the horizon. */}
              <i
                aria-hidden="true"
                className="absolute -bottom-[26px] -left-5 -right-5 block h-[26px] rounded-md border-4 border-[var(--sb-ink)] bg-[var(--sb-dirt)] sm:-left-6 sm:-right-6"
              />
              <div className="relative rounded-[22px_22px_10px_10px] border-4 border-[var(--sb-ink)] bg-[var(--sb-beige)] p-3 pb-8 shadow-[8px_8px_0_var(--sb-ink)] sm:px-[22px] sm:pb-[34px] sm:pt-[22px]">
                <div
                  data-screen
                  data-sb-intro
                  className="sb-crt p-3 sm:px-6 sm:pb-[26px] sm:pt-[22px]"
                >
                  <pre
                    data-crt
                    className="sb-phosphor m-0 whitespace-pre-wrap text-[clamp(12px,3.5vw,24px)] leading-[1.15]"
                  >
                    <span data-crt-head className="sb-dim">
                      Compy 386 — animaxx.exe — 1 new message
                    </span>
                    {"\n\n"}
                    <span data-crt-body>
                      <span className="sb-hi">Dear Strong Bad,</span>
                      {
                        "\nMy website is totally static and\nhas, like, no rizz whatsoever.\nHow do I make it do the thing?\n"
                      }
                      <span className="sb-dim">— Bored in Boise</span>
                    </span>
                    {"\n\n"}
                    <span data-crt-reply>
                      <span className="sb-hi">&gt;</span> Easy. You animaxx it, dummy.
                    </span>
                    {/* Held back with the rest of the intro: a block cursor
                        sitting alone on a screen with nothing typed on it yet
                        belongs to a different machine. */}
                    <i
                      data-crt-cursor
                      data-sb-intro
                      aria-hidden="true"
                      className="sb-cursor ml-[2px]"
                    />
                  </pre>
                  <span
                    data-deleted
                    aria-hidden="true"
                    className="sb-phosphor invisible absolute inset-0 z-[3] grid place-items-center text-[clamp(40px,11vw,104px)] leading-none tracking-[0.02em]"
                  >
                    DELETED!!
                  </span>
                </div>
                <span className="absolute bottom-[6px] left-4 font-display text-[13px] tracking-[0.06em] text-[var(--sb-ink)] sm:bottom-[10px] sm:left-[26px] sm:text-[16px]">
                  <b className="font-normal text-[var(--sb-red)]">COMPY</b> 386
                </span>
                <span
                  aria-hidden="true"
                  className="absolute bottom-[8px] right-4 flex gap-1 sm:bottom-[12px] sm:right-[26px]"
                >
                  {[0, 1, 2, 3, 4].map((vent) => (
                    <i
                      key={vent}
                      className="block h-[14px] w-1 rounded-sm bg-[var(--sb-ink)] opacity-50"
                    />
                  ))}
                </span>
              </div>
            </div>

            {/* The gloves, on the keyboard, in front of the desk. */}
            <svg
              aria-hidden="true"
              viewBox="0 0 560 120"
              fill="none"
              className="relative z-[1] -mt-[6px] w-[min(560px,100%)]"
            >
              <g data-keyboard data-sb-intro>
                <rect
                  x="120"
                  y="70"
                  width="320"
                  height="34"
                  rx="8"
                  fill="var(--sb-beige2)"
                  stroke="var(--sb-ink)"
                  strokeWidth="5"
                />
                <g stroke="var(--sb-ink)" strokeWidth="2" opacity="0.6">
                  <path d="M140 80h280M140 90h280M140 100h280" />
                </g>
              </g>
              <g data-glove="left" data-sb-intro>
                <g data-bob>
                  <ellipse
                    cx="150"
                    cy="62"
                    rx="58"
                    ry="40"
                    fill="var(--sb-red)"
                    stroke="var(--sb-ink)"
                    strokeWidth="6"
                  />
                  <path
                    d="M105 44c-14 8-18 26-6 38"
                    stroke="var(--sb-ink)"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                  <rect
                    x="120"
                    y="4"
                    width="60"
                    height="30"
                    rx="8"
                    fill="var(--sb-red)"
                    stroke="var(--sb-ink)"
                    strokeWidth="6"
                  />
                </g>
              </g>
              <g data-glove="right" data-sb-intro>
                <g data-bob>
                  <ellipse
                    cx="410"
                    cy="62"
                    rx="58"
                    ry="40"
                    fill="var(--sb-red)"
                    stroke="var(--sb-ink)"
                    strokeWidth="6"
                  />
                  <path
                    d="M455 44c14 8 18 26 6 38"
                    stroke="var(--sb-ink)"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                  <rect
                    x="380"
                    y="4"
                    width="60"
                    height="30"
                    rx="8"
                    fill="var(--sb-red)"
                    stroke="var(--sb-ink)"
                    strokeWidth="6"
                  />
                </g>
              </g>
            </svg>
          </div>

          {/* -------------------------------------------------- the pitch */}
          <div className="mt-10 lg:col-start-1 lg:row-start-2 lg:mt-7">
            <div
              data-bubble
              data-sb-intro
              className="sb-card sb-tail-right max-w-[40ch] rounded-[18px] px-5 py-4 shadow-[4px_4px_0_var(--sb-ink)] [--sb-tail-top:40%]"
            >
              <p data-pitch className="m-0 text-[19px] leading-[1.45] sm:text-[21px]">
                Your static <b className="text-[var(--sb-red)]">low rizz</b> website is{" "}
                <b className="text-[var(--sb-blue)]">cooked</b>. It has{" "}
                <b className="text-[var(--sb-red)]">negative aura</b>. Use agents to
              </p>
              <p
                data-shout
                data-sb-intro
                className="m-0 mt-2 font-display text-[26px] leading-none text-[var(--sb-red)] [-webkit-text-stroke:1.5px_var(--sb-ink)] [paint-order:stroke_fill] sm:text-[30px]"
              >
                animate the shit out of it.
              </p>
            </div>
          </div>

          {/* ------------------------------------------------ the buttons */}
          <div className="mt-7 flex flex-wrap gap-[18px] lg:col-start-1 lg:row-start-3">
            <span data-cta-slap data-sb-intro className="inline-block">
              <button
                type="button"
                data-cta
                className={`${CTA_BASE} bg-[var(--sb-blue)] [transform:rotate(-1deg)]`}
                onClick={() => press.current("showcase")}
              >
                Showcase
              </button>
            </span>
            <span data-cta-slap data-sb-intro className="inline-block">
              <button
                type="button"
                data-cta
                className={`${CTA_BASE} bg-[var(--sb-red)] [transform:rotate(1.5deg)]`}
                onClick={() => press.current("animaxx")}
              >
                Get Animaxxed
                <small className="-mt-[2px] block font-sans text-[11px] font-black uppercase tracking-[0.14em] opacity-85">
                  click here to e-mail
                </small>
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
