"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  gsap,
  navigateWithPageTransition,
  prefersReducedMotion,
  useGSAP,
} from "@/components/motion";
import { Statement } from "@/components/ui";
import { speakIn, type Emphasis } from "@/lib/animation/effects/speak";
import { titleParticles } from "@/lib/animation/effects/titleParticles";
import { startWave } from "@/lib/animation/effects/wave";
import { watchPageTransition } from "@/lib/animation/pageState";
import { blastOff, type BlastOff } from "@/lib/animation/effects/blastOff";
import { marquee, reactor } from "@/lib/animation/effects/particleButtons";
import { ParticleButton, type ParticleButtonHandle } from "./ParticleButton";

/*
 * The front door: the headline's letters scatter in with the
 * route entrance, burst into particles and reform, then the subhead is spoken
 * word by word. Only then do the headline's letters start doing the wave.
 *
 * Pressing either call to action blasts the whole hero apart, and the blast
 * hands off to the route transition: Showcase leaves for the showcase, Get
 * Animaxxed for the intake form.
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
/** Milliseconds after a resize before the wave starts again, when the page did not replay. */
const WAVE_RESTART = 1150;
/**
 * Seconds into the blast at which the route swaps. By then the letters have
 * all but left, so the route exit is skipped rather than played on an empty page.
 */
const HANDOFF = 0.6;

type Action = "showcase" | "animaxx";
const HREF: Record<Action, string> = { showcase: "/showcase", animaxx: "/animaxx" };

/* Calls to action are set like the headline: big, extra bold, and chunky. */
const BUTTON_BASE =
  "inline-flex cursor-pointer items-center rounded-lg px-5 py-2.5 font-sans text-3xl font-extrabold uppercase tracking-[-0.02em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus sm:px-8 sm:py-4 sm:text-5xl";
const BUTTON_PRIMARY = `${BUTTON_BASE} bg-inverse text-inverse-foreground hover:bg-inverse-hover`;
const BUTTON_SECONDARY = `${BUTTON_BASE} border-2 border-foreground text-foreground hover:bg-surface-hover`;

export function Hero() {
  const scope = useRef<HTMLDivElement>(null);
  const showcase = useRef<ParticleButtonHandle>(null);
  const animaxx = useRef<ParticleButtonHandle>(null);
  const press = useRef<(action: Action) => void>(() => {});
  const router = useRouter();

  // The blast hands off to the route without a Link, so nothing has
  // prefetched the destinations; do it here so the swap is not kept waiting.
  useEffect(() => {
    for (const href of Object.values(HREF)) {
      router.prefetch(href);
    }
  }, [router]);

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
        press.current = (action: Action) => navigateWithPageTransition(HREF[action]);
        return;
      }

      let titleBurst: ReturnType<typeof titleParticles> = null;
      let speech: ReturnType<typeof speakIn> | null = null;
      let stopWave: ((keepSplit?: boolean) => void) | null = null;
      let blast: BlastOff | null = null;
      // Set once a blast has handed off to navigation: the route exit that
      // follows must not put the pieces back.
      let departing = false;

      press.current = contextSafe((action: Action) => {
        const pressed = action === "showcase" ? showcase.current : animaxx.current;
        const other = action === "showcase" ? animaxx.current : showcase.current;
        if (blast || !pressed?.element || !other?.element) {
          return;
        }
        // Land any words still being spoken, and hand the letters back from
        // the wave, so the blast starts from the settled composition.
        titleBurst?.timeline.progress(1);
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
        blast.timeline.call(
          () => {
            departing = true;
            navigateWithPageTransition(HREF[action], { immediate: true });
          },
          [],
          HANDOFF,
        );
      });

      // The wave pins each letter to a pixel width; drop it the moment the
      // hero is resized so the headline can reflow. The settled resize
      // replays the page.
      const enteredWidth = root.offsetWidth;
      let restartWave: number | undefined;
      const resize = new ResizeObserver((entries) => {
        if (Math.abs((entries[0]?.contentRect.width ?? enteredWidth) - enteredWidth) < 1) {
          return;
        }
        titleBurst?.timeline.progress(1);
        stopWave?.();
        stopWave = null;
        // A smaller resize does not replay the page; wave again after a beat.
        window.clearTimeout(restartWave);
        restartWave = window.setTimeout(() => {
          if (speech && !departing && !stopWave) {
            stopWave = startWave(heading, { period: WAVE_PERIOD });
          }
        }, WAVE_RESTART);
      });
      resize.observe(root);

      const unwatch = watchPageTransition(heading, {
        onIdle: contextSafe(() => {
          titleBurst?.revert();
          titleBurst = titleParticles(heading, contextSafe(() => {
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
          }));
        }),
        onExiting: () => {
          if (departing) {
            // The blast already cleared the page; leave it that way.
            return;
          }
          titleBurst?.revert();
          titleBurst = null;
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
        resize.disconnect();
        window.clearTimeout(restartWave);
        unwatch();
        titleBurst?.revert();
        speech?.timeline.kill();
        blast?.revert();
        speech?.revert();
        stopWave?.();
      };
    },
    { scope },
  );

  return (
    <div ref={scope} className="relative">
      <Statement
        as="h1"
        data-page-transition="letters"
        data-page-transition-arrival="impact"
        className="max-w-[10ch] ![text-wrap:wrap] text-[calc(26vw_-_0.78rem)] leading-[0.9] tracking-[-0.04em] [font-kerning:none] [text-rendering:optimizeSpeed] sm:text-[clamp(4.5rem,16cqi,16rem)]"
      >
        Motion to the Max
      </Statement>
      <p data-speak-intro className="mt-6 max-w-[64ch] text-[1.75rem] leading-[1.2] tracking-[-0.02em] text-muted sm:mt-10 sm:text-display sm:leading-[1.35]">
        Your static low rizz website is cooked. It has negative aura.
        <br />
        Use agents to <strong className="inline-block origin-left font-extrabold tracking-[0.02em] sm:scale-x-120">
          animate the shit out of it.
        </strong>
      </p>
      <div data-hero-actions className="mt-6 flex flex-wrap gap-3 sm:mt-12 sm:gap-4">
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
