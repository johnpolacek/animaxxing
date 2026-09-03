"use client";

import { useRef } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/components/motion";
import { Statement } from "@/components/ui";
import { speakIn, type Emphasis } from "@/lib/animation/effects/speak";
import { startWave } from "@/lib/animation/effects/wave";
import { watchPageTransition } from "@/lib/animation/pageState";
import { blastOff, type BlastOff } from "@/lib/animation/effects/blastOff";
import { marquee, reactor } from "@/lib/animation/effects/particleButtons";
import { ParticleButton, type ParticleButtonHandle } from "./ParticleButton";

/*
 * The front door, in three beats: the headline's letters scatter in with the
 * route entrance, the subhead is spoken in word by word, and only then do the
 * headline's letters start doing the wave.
 *
 * Pressing either call to action blasts the whole hero apart. Neither has a
 * destination yet, so after a beat the blast rewinds and the hero settles
 * back into its idle state.
 */
const EMPHASIS: Emphasis[] = [
  { word: "low", finish: "tilt", angle: -3 },
  { word: "rizz", finish: "tilt", angle: -3 },
  { word: "cooked", finish: "broken" },
  { word: "negative", finish: "tilt", angle: 2 },
  { word: "aura", finish: "tilt", angle: -1.5 },
  "agents",
  "animate",
  "shit",
];
/** Silence between the headline landing and the first spoken word. */
const SPEAK_DELAY = 0.3;
const WAVE_PERIOD = 1.5;
/** Seconds the page stays blown apart before pulling itself back together. */
const BLAST_HOLD = 0.5;

type Action = "showcase" | "animaxx";

/* Calls to action are set like the headline: big, extra bold, and chunky. */
const BUTTON_BASE =
  "inline-flex cursor-pointer items-center rounded-lg px-6 py-3 font-sans text-4xl font-extrabold uppercase tracking-[-0.02em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus sm:px-8 sm:py-4 sm:text-5xl";
const BUTTON_PRIMARY = `${BUTTON_BASE} bg-inverse text-inverse-foreground hover:bg-inverse-hover`;
const BUTTON_SECONDARY = `${BUTTON_BASE} border-2 border-foreground text-foreground hover:bg-surface-hover`;

export function Hero() {
  const scope = useRef<HTMLDivElement>(null);
  const showcase = useRef<ParticleButtonHandle>(null);
  const animaxx = useRef<ParticleButtonHandle>(null);
  const press = useRef<(action: Action) => void>(() => {});

  useGSAP(
    (_context, contextSafe) => {
      const root = scope.current;
      const heading = root?.querySelector<HTMLElement>("h1");
      const subhead = root?.querySelector<HTMLElement>("[data-speak-intro]");
      const actions = root?.querySelector<HTMLElement>("[data-hero-actions]");
      if (!root || !heading || !subhead || !actions || !contextSafe) {
        return;
      }
      if (prefersReducedMotion()) {
        gsap.set([subhead, actions], { autoAlpha: 1 });
        // A quiet stand-in for the blast: the hero blinks out and back.
        press.current = contextSafe(() => {
          gsap
            .timeline({ overwrite: "auto" })
            .to(root, { autoAlpha: 0, duration: 0.15 })
            .to(root, { autoAlpha: 1, duration: 0.15 }, `+=${BLAST_HOLD}`);
        });
        return;
      }

      let speech: ReturnType<typeof speakIn> | null = null;
      let stopWave: ((keepSplit?: boolean) => void) | null = null;
      let blast: BlastOff | null = null;

      const settle = contextSafe(() => {
        blast?.revert();
        blast = null;
        showcase.current?.idle();
        animaxx.current?.idle();
        stopWave = startWave(heading, { period: WAVE_PERIOD });
      });

      press.current = contextSafe((action: Action) => {
        const pressed = action === "showcase" ? showcase.current : animaxx.current;
        const other = action === "showcase" ? animaxx.current : showcase.current;
        if (blast || !pressed?.element || !other?.element) {
          return;
        }
        // Land any words still being spoken, and hand the letters back from
        // the wave, so the blast starts from the settled composition.
        speech?.timeline.progress(1);
        stopWave?.();
        stopWave = null;
        pressed.blast();
        other.blast();
        blast = blastOff({
          root,
          heading,
          words: speech?.words ?? [],
          pressed: pressed.element,
          others: [other.element],
        });
        blast.timeline.eventCallback("onComplete", () => {
          gsap.delayedCall(BLAST_HOLD, () => blast?.timeline.reverse());
        });
        blast.timeline.eventCallback("onReverseComplete", settle);
      });

      const unwatch = watchPageTransition(heading, {
        onIdle: contextSafe(() => {
          speech = speakIn(subhead, { emphasis: EMPHASIS, delay: SPEAK_DELAY });
          // The buttons assemble from particles alongside the first spoken words.
          gsap.set(actions, { autoAlpha: 1 });
          showcase.current?.enter(SPEAK_DELAY);
          animaxx.current?.enter(SPEAK_DELAY + 0.2);
          // The split stays in place after the words land so the broken and
          // tilted finishes persist; it is only reverted on the way out.
          speech.timeline.eventCallback(
            "onComplete",
            contextSafe(() => {
              stopWave = startWave(heading, { period: WAVE_PERIOD });
            }),
          );
        }),
        onExiting: () => {
          // The subhead and buttons are not part of the route exit, so see them out here.
          speech?.timeline.kill();
          blast?.revert();
          blast = null;
          gsap.to(subhead, { autoAlpha: 0, duration: 0.2 });
          showcase.current?.exit();
          animaxx.current?.exit();
          stopWave?.(true);
          stopWave = null;
        },
      });

      return () => {
        unwatch();
        speech?.timeline.kill();
        blast?.revert();
        speech?.revert();
        stopWave?.();
      };
    },
    { scope },
  );

  return (
    <div ref={scope}>
      <Statement
        as="h1"
        data-page-transition="letters"
        className="max-w-[10ch] ![text-wrap:wrap] text-[clamp(4.5rem,16cqi,16rem)] leading-[0.9] tracking-[-0.04em] [font-kerning:none] [text-rendering:optimizeSpeed]"
      >
        Motion to the Max
      </Statement>
      <p data-speak-intro className="mt-10 max-w-[64ch] text-display leading-[1.35] text-muted">
        Your static low rizz website is cooked. It has negative aura.
        <br />
        Use agents to <strong className="inline-block origin-left scale-x-120 font-extrabold tracking-[0.02em]">
          animate the shit out of it.
        </strong>
      </p>
      <div data-hero-actions className="mt-12 flex flex-wrap gap-4">
        <ParticleButton
          ref={showcase}
          effect={marquee}
          className={BUTTON_SECONDARY}
          onClick={() => press.current("showcase")}
        >
          Showcase
        </ParticleButton>
        <ParticleButton
          ref={animaxx}
          effect={reactor}
          className={BUTTON_PRIMARY}
          onClick={() => press.current("animaxx")}
        >
          Get Animaxxed
        </ParticleButton>
      </div>
    </div>
  );
}
