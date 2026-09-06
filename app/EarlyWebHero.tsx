"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  gsap,
  navigateWithPageTransition,
  prefersReducedMotion,
  useGSAP,
  type SplitText,
} from "@/components/motion";
import {
  chunkLoad,
  chunkUnload,
  equalizer,
  lcdFlicker,
  letterWave,
  linesRender,
  marquee,
  odometer,
  stampIn,
  typeIn,
} from "@/lib/animation/effects/earlyweb";
import { watchPageTransition } from "@/lib/animation/pageState";
import { SKILLS_REPO } from "./animaxx/content";

/*
 * The front door, 1997.
 *
 * Everything between the Netscape chrome (the window, the masthead and the
 * status bar belong to SiteShell): the yellow marquee, the construction
 * barrier, and the two-column table every GeoCities page was built out of —
 * a 200px sidebar of boxes on the left, the pitch on the right.
 *
 * It arrives over a 28.8k modem. Nothing fades in, because 1997 had no
 * compositor: the boxes snap on in bursts, interleaved the way a table
 * paints its cells, the paragraph renders a line at a time, the headline
 * types itself a character at a time behind a block cursor, the hit counter
 * spins up and then rolls over by one (you are the newest visitor), and the
 * award badges are stamped on one after the other. About three seconds, and
 * then nothing on the page ever sits still again: the marquee stutters, the
 * headline waves, the stripes crawl, the LED and the NEW! blink, the ✳ spin,
 * the hands bounce, the envelope flaps and the MIDI equalizer jumps.
 *
 * Pressing a CTA runs the modem backwards — the button sinks, its ►► blinks
 * double time, and the page is deleted bottom-up in the same bursts it
 * arrived in — and the flight hands off to the route.
 */

type Action = "showcase" | "animaxx";
const HREF: Record<Action, string> = { showcase: "/showcase", animaxx: "/animaxx" };

/** Seconds into the unload at which the route swaps. */
const HANDOFF = 0.5;

const MARQUEE_TEXT =
  "*** WELCOME TO MY HOMEPAGE !!! *** AGENT SKILLS FOR GSAP *** SIGN MY GUESTBOOK *** THIS PAGE IS BEST VIEWED IN NETSCAPE 3.0 AT 800x600 *** MOTION TO THE MAX!!! ***";

const HEADLINE = "MOTION TO THE MAX";

/** The hit count on the page, and the one it rolls over to when you arrive. */
const COUNT = "000420";
const COUNT_NEXT = "000421";

const GITHUB = "https://github.com/johnpolacek/animaxxing";

const NAV: { label: string; href?: string; external?: boolean; badge?: boolean }[] = [
  { label: "Showcase", href: "/showcase", badge: true },
  { label: "Animaxx", href: "/animaxx" },
  { label: "Skills", href: SKILLS_REPO, external: true },
  { label: "GitHub", href: GITHUB, external: true },
  { label: "Guestbook" },
  { label: "Links" },
];

const BADGES: { label: string; className: string }[] = [
  {
    label: "Netscape NOW!",
    className: "bg-[linear-gradient(#0a4a9a,#031f4a)] text-white",
  },
  {
    label: "IE 3.0 ready",
    className: "bg-[linear-gradient(#55aaaa,#113366)] text-white",
  },
  {
    label: "800x600",
    className: "bg-black font-code text-[var(--web-lime)]",
  },
  {
    label: "GSAP inside",
    className: "bg-[#0ae448] text-black",
  },
  {
    label: "Motion Webring",
    className: "bg-[linear-gradient(#ff00ff,#880088)] text-white",
  },
];

const BARS = [0, 1, 2, 3, 4, 5, 6, 7];

const BOX = "web-inset mb-2 p-2 text-[14px] text-foreground";
const BOX_PADDED = "web-inset mb-2 p-3 text-[14px] text-foreground";
const BOX_HEAD =
  "-mx-2 -mt-2 mb-[6px] bg-[var(--web-navy)] px-[5px] py-[2px] font-mono text-[13px] font-bold text-white";
const LINK = "text-[var(--web-link)] visited:text-[var(--web-visited)] underline";
const CTA =
  "web-gleam inline-block cursor-pointer border-[2px] [border-style:outset] border-[var(--web-light)] bg-[var(--web-gray)] px-[22px] py-[6px] font-mono text-[15px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--web-navy)]";

export function EarlyWebHero() {
  const scope = useRef<HTMLDivElement>(null);
  const press = useRef<(action: Action) => void>(() => {});
  const router = useRouter();

  useEffect(() => {
    for (const href of Object.values(HREF)) {
      router.prefetch(href);
    }
  }, [router]);

  useGSAP(
    (_context, contextSafe) => {
      const root = scope.current;
      if (!root || !contextSafe) {
        return;
      }
      const q = gsap.utils.selector(root);
      const one = (selector: string) => q<HTMLElement>(selector)[0] ?? null;

      const everything = q<HTMLElement>("[data-web-intro]");
      const digits = q<HTMLElement>("[data-digit]");
      const strip = one("[data-strip]");
      const barrier = one("[data-barrier]");
      const head = one("[data-headline]");
      const rule = one("[data-rule]");

      /* ------------------------------------------------- reduced motion */
      if (prefersReducedMotion()) {
        gsap.set(everything, { autoAlpha: 1 });
        digits.forEach((digit, index) => {
          digit.textContent = COUNT_NEXT[index] ?? "0";
        });
        equalizer(q<HTMLElement>("[data-eq-bar]"));
        press.current = (action: Action) => navigateWithPageTransition(HREF[action]);
        return;
      }

      /* -------------------------------------------------- the machinery */
      let sequence: gsap.core.Timeline | null = null;
      let unload: gsap.core.Timeline | null = null;
      let departing = false;
      const splits: (SplitText | null)[] = [];
      const teardowns: (() => void)[] = [];
      let wave: ReturnType<typeof letterWave> | null = null;
      let flicker: gsap.core.Tween | null = null;

      /** Everything that loops, stopped, and every split put back together. */
      const settle = () => {
        wave?.tween?.kill();
        wave?.split?.revert();
        wave = null;
        flicker?.kill();
        flicker = null;
        for (const teardown of teardowns.splice(0)) {
          teardown();
        }
        for (const split of splits.splice(0)) {
          split?.revert();
        }
      };

      /* ------------------------------------------------ the mail widget */
      /** The envelope GIF: the flap opens and closes, and now and then the
       *  letter inside pokes out of the top. */
      const envelope = () => {
        const flap = one("[data-flap]");
        const letter = one("[data-letter]");
        if (!flap || !letter) {
          return () => {};
        }
        const open = gsap.to(flap, {
          rotationX: 155,
          duration: 0.85,
          repeat: -1,
          yoyo: true,
          repeatDelay: 0.5,
          ease: "power1.inOut",
          transformOrigin: "50% 0%",
          transformPerspective: 220,
        });
        const pop = gsap.to(letter, {
          y: -9,
          duration: 0.35,
          ease: "power2.out",
          repeat: -1,
          yoyo: true,
          repeatDelay: 2.4,
          delay: 1.1,
        });
        return () => {
          open.kill();
          pop.kill();
          gsap.set([flap, letter], { clearProps: "transform" });
        };
      };

      /* ------------------------------------------------------ hover life */
      /** The label of a bevel button wobbles when the pointer lands on it. */
      const hovers: (() => void)[] = [];
      for (const button of q<HTMLElement>("[data-cta]")) {
        const label = button.querySelector<HTMLElement>("[data-cta-label]");
        if (!label) {
          continue;
        }
        const wobble = contextSafe(() => {
          gsap.fromTo(
            label,
            { rotation: -4 },
            { rotation: 0, duration: 0.6, ease: "elastic.out(1.6, 0.32)", overwrite: true },
          );
        });
        button.addEventListener("pointerenter", wobble);
        hovers.push(() => button.removeEventListener("pointerenter", wobble));
      }

      /* ----------------------------------------------------- the outro */
      press.current = contextSafe((action: Action) => {
        if (unload) {
          return;
        }
        sequence?.progress(1);
        settle();

        const button = one(`[data-cta="${action}"]`);
        if (button) {
          button.style.borderStyle = "inset";
          const label = button.querySelector<HTMLElement>("[data-cta-label]");
          if (label) {
            gsap.set(label, { x: 1, y: 1 });
          }
          const chevron = button.querySelector<HTMLElement>("[data-chevron]");
          if (chevron) {
            chevron.classList.remove("web-blink");
            gsap.to(chevron, {
              autoAlpha: 0,
              duration: 0.07,
              repeat: -1,
              yoyo: true,
              ease: "steps(1)",
            });
          }
        }

        const tl = gsap.timeline();
        unload = tl;
        // The page is deleted the way it arrived: in bursts, but bottom-up.
        chunkUnload(tl, everything, 0.12, { batch: 6, gap: 0.05, jitter: 0.06 });
        tl.call(
          () => {
            departing = true;
            navigateWithPageTransition(HREF[action], { immediate: true });
          },
          undefined,
          HANDOFF,
        );
      });

      /* ------------------------------------------------------ the load */
      const unwatch = watchPageTransition(root, {
        onIdle: contextSafe(() => {
          const tl = gsap.timeline();
          sequence = tl;

          // The strip and the barrier come down the wire first, then the
          // boxes, interleaved the way a two-column table paints: left
          // cell, right cell, left cell, right cell.
          chunkLoad(tl, [strip, barrier], 0, { batch: 1, gap: 0.2, jitter: 0.14 });
          chunkLoad(
            tl,
            [
              one("[data-box='nav']"),
              one("[data-box='main']"),
              one("[data-box='visitors']"),
              one("[data-box='news']"),
              one("[data-box='awards']"),
              one("[data-box='midi']"),
            ],
            0.34,
            { batch: 2, gap: 0.15, jitter: 0.2 },
          );

          // The marquee is running before the rest of the page is in.
          tl.call(
            () => {
              teardowns.push(marquee(strip?.querySelector("[data-marquee]") ?? null));
            },
            undefined,
            0.45,
          );

          // Left column: links, counter, badges, the MIDI panel.
          chunkLoad(tl, q<HTMLElement>("[data-nav-item]"), 0.62, { batch: 2, gap: 0.1, seed: 3 });
          odometer(tl, digits, COUNT, 0.9, {
            duration: 1,
            stagger: 0.08,
            incrementDelay: 0.55,
          });
          chunkLoad(tl, q<HTMLElement>("[data-counter-note]"), 1.25, { batch: 1, gap: 0.12 });
          stampIn(tl, q<HTMLElement>("[data-badge]"), 1.55, { stagger: 0.12 });
          chunkLoad(tl, q<HTMLElement>("[data-midi]"), 1.9, { batch: 1, gap: 0.12, seed: 5 });
          // The MIDI starts playing the moment its panel is on the page.
          tl.call(
            () => {
              teardowns.push(equalizer(q<HTMLElement>("[data-eq-bar]")));
              teardowns.push(marquee(one("[data-track]"), { amount: 3, fps: 12 }));
            },
            undefined,
            2.05,
          );

          // Right column: the headline types, the rule draws, the pitch
          // renders a line at a time, the buttons are stamped on.
          const typing = typeIn(tl, head, 0.7, { cps: 22 });
          splits.push(typing);
          const typed = 0.7 + HEADLINE.length / 22;
          chunkLoad(tl, q<HTMLElement>("[data-tagline]"), typed + 0.1, { batch: 1 });

          if (rule) {
            tl.set(rule, { autoAlpha: 1, scaleX: 0, transformOrigin: "left center" }, 0.9);
            tl.to(rule, { scaleX: 1, duration: 0.45, ease: "none" }, 0.9);
          }
          splits.push(linesRender(tl, one("[data-sub]"), 1.45));
          chunkLoad(tl, q<HTMLElement>("[data-shout]"), 2.05, { batch: 1 });
          stampIn(tl, q<HTMLElement>("[data-cta]"), 2.2, { stagger: 0.14 });
          chunkLoad(tl, q<HTMLElement>("[data-mail], [data-updated]"), 2.45, {
            batch: 1,
            gap: 0.16,
            seed: 9,
          });
          chunkLoad(tl, q<HTMLElement>("[data-news-item]"), 2.55, { batch: 2, gap: 0.11, seed: 11 });

          // The headline is typed: put it back together and set it waving.
          tl.call(
            () => {
              const index = splits.indexOf(typing);
              if (index >= 0) {
                splits.splice(index, 1);
              }
              typing?.revert();
              wave = letterWave(head, { amount: 6, rotate: 24, each: 0.05 });
            },
            undefined,
            typed + 0.55,
          );

          // Once the page is in, it never stops.
          tl.call(
            () => {
              teardowns.push(envelope());
              flicker = lcdFlicker(one("[data-counter]"));
            },
            undefined,
            2.9,
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
        unload?.kill();
        settle();
        for (const off of hovers) {
          off();
        }
      };
    },
    { scope },
  );

  return (
    <div ref={scope} className="font-sans text-[16px] text-foreground">
      {/* ------------------------------------------- marquee + barrier */}
      <section data-page-transition>
        <div
          data-web-intro
          data-strip
          className="my-[10px] overflow-hidden border border-black bg-[var(--web-yellow)] py-[2px]"
        >
          <div
            data-marquee
            className="flex w-max whitespace-nowrap font-mono text-[14px] font-bold text-[var(--web-navy)]"
          >
            <span className="px-6">{MARQUEE_TEXT}</span>
            <span className="px-6" aria-hidden="true">
              {MARQUEE_TEXT}
            </span>
          </div>
        </div>

        <div
          data-web-intro
          data-barrier
          className="web-stripes my-2 py-1 text-center font-mono text-[12px] font-bold text-black"
        >
          <span className="inline-block bg-[var(--web-yellow)] px-[10px] py-[2px]">
            <span className="web-bounce">🚧</span> THIS SITE IS UNDER CONSTRUCTION{" "}
            <span className="web-bounce" style={{ animationDelay: "-0.3s" }}>
              🚧
            </span>
          </span>
        </div>
      </section>

      {/* ------------------------------------------------ table layout */}
      <section
        data-page-transition
        className="grid items-start gap-2 min-[700px]:grid-cols-[200px_1fr]"
      >
        {/* ------------------------------------------------- left column */}
        {/* `min-w-0` so a grid item cannot be widened past its track by the
            scrolling MIDI strip inside it; on a phone the pitch leads and
            the sidebar follows, though the table order is unchanged. */}
        <div className="order-2 min-w-0 min-[700px]:order-1">
          {/* Navigation */}
          <div data-web-intro data-box="nav" className={BOX}>
            <h2 className={BOX_HEAD}>Navigation</h2>
            <ul className="m-0 list-none p-0">
              {NAV.map((item) => (
                <li key={item.label} data-web-intro data-nav-item className="group my-[3px]">
                  <span
                    aria-hidden="true"
                    className="inline-block w-[0.95em] -translate-x-1 text-[var(--web-red)] opacity-0 transition duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                  >
                    »
                  </span>
                  {item.href && item.external ? (
                    <a
                      className={LINK}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      {item.label}
                    </a>
                  ) : item.href ? (
                    <Link className={LINK} href={item.href}>
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      className="text-[var(--web-link)] underline decoration-dotted"
                      title="Under construction"
                    >
                      {item.label}
                    </span>
                  )}
                  {item.badge ? (
                    <span className="web-blink ml-[6px] font-mono text-[11px] font-bold text-[var(--web-red)]">
                      NEW!
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          {/* Visitors */}
          <div data-web-intro data-box="visitors" className={BOX}>
            <h2 className={BOX_HEAD}>Visitors</h2>
            <div data-counter className="my-[6px] flex justify-center gap-[2px]">
              {COUNT.split("").map((digit, index) => (
                <b
                  // Digit slots, not values: positional by nature.
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length slots
                  key={index}
                  data-web-intro
                  data-digit
                  className="web-lcd text-[20px]"
                >
                  {digit}
                </b>
              ))}
            </div>
            <div
              data-web-intro
              data-counter-note
              className="text-center font-mono text-[11px] text-muted"
            >
              since 09/05/1997
            </div>
            <div data-web-intro data-counter-note className="mt-1 text-center font-mono text-[11px]">
              <span className="web-blink text-[var(--web-red)]">●</span> 3 online now
            </div>
          </div>

          {/* Awards */}
          <div data-web-intro data-box="awards" className={`${BOX} text-center`}>
            <h2 className={BOX_HEAD}>Awards</h2>
            {BADGES.map((badge) => (
              <span
                key={badge.label}
                data-web-intro
                data-badge
                className={`web-badge web-gleam m-[3px_1px] ${badge.className}`}
              >
                {badge.label}
              </span>
            ))}
          </div>

          {/* Now playing */}
          <div data-web-intro data-box="midi" className={BOX}>
            <h2 className={BOX_HEAD}>♪ Now Playing</h2>
            <div
              data-web-intro
              data-midi
              className="overflow-hidden border border-[var(--web-dark)] bg-black py-[1px]"
            >
              <div
                data-track
                className="flex w-max whitespace-nowrap font-code text-[11px] text-[var(--web-lime)]"
              >
                <span className="px-3">animaxxing.mid · 24 kbps · MIDI · stereo</span>
                <span className="px-3" aria-hidden="true">
                  animaxxing.mid · 24 kbps · MIDI · stereo
                </span>
              </div>
            </div>
            <div
              data-web-intro
              data-midi
              aria-hidden="true"
              className="mt-2 flex h-[34px] items-end gap-[3px]"
            >
              {BARS.map((bar) => (
                <span
                  key={bar}
                  data-eq-bar
                  className="block h-full flex-1 bg-[var(--web-lime)]"
                />
              ))}
            </div>
            <div data-web-intro data-midi className="mt-1 font-mono text-[11px] text-muted">
              [ turn your speakers up ]
            </div>
          </div>
        </div>

        {/* ------------------------------------------------ right column */}
        <div className="order-1 min-w-0 min-[700px]:order-2">
          {/* The pitch */}
          <div data-web-intro data-box="main" className={`${BOX_PADDED}`}>
            <h1 className="m-0 mb-1 text-center font-sans text-[clamp(28px,7vw,64px)] leading-none font-bold">
              <span data-web-intro data-headline className="web-rainbow inline-block">
                {HEADLINE}
              </span>
              <small
                data-web-intro
                data-tagline
                className="mt-[6px] block font-sans text-[16px] italic font-normal text-[var(--accent-cool)]"
              >
                ~ * ~ Agent skills for GSAP ~ * ~
              </small>
            </h1>

            <div data-web-intro data-rule className="web-hr" />

            <p
              data-web-intro
              data-sub
              className="mx-[6%] my-[14px] font-billing text-[19px] leading-[1.4]"
            >
              Your static <b className="text-[var(--web-red)]">low rizz</b> website is{" "}
              <b className="text-[var(--web-blue)]">cooked</b>. It has{" "}
              <b className="text-[light-dark(#008000,#ffff00)]">negative aura</b>. Use agents to
            </p>

            <p
              data-web-intro
              data-shout
              className="m-0 text-center font-billing text-[clamp(20px,4.5vw,30px)] font-bold"
            >
              <span className="web-bounce" aria-hidden="true">
                👉
              </span>{" "}
              <span className="web-rainbow">ANIMATE THE SHIT OUT OF IT.</span>{" "}
              <span className="web-bounce" aria-hidden="true" style={{ animationDelay: "-0.3s" }}>
                👈
              </span>
            </p>

            <div className="my-4 flex flex-wrap justify-center gap-4">
              <button
                type="button"
                data-web-intro
                data-cta="showcase"
                className={`${CTA} text-black`}
                onClick={() => press.current("showcase")}
              >
                <span data-cta-label className="inline-block">
                  [ Showcase ]
                </span>
              </button>
              <button
                type="button"
                data-web-intro
                data-cta="animaxx"
                className={`${CTA} text-[var(--web-red)]`}
                onClick={() => press.current("animaxx")}
              >
                <span data-cta-label className="inline-block">
                  <span data-chevron className="web-blink" aria-hidden="true">
                    ►►
                  </span>{" "}
                  Get Animaxxed!
                </span>
              </button>
            </div>

            <p data-web-intro data-mail className="my-[6px] text-center font-mono text-[13px]">
              <span
                aria-hidden="true"
                className="relative mr-[6px] inline-block h-[20px] w-[32px] border border-black bg-white align-middle"
              >
                <span
                  data-letter
                  className="absolute inset-x-[5px] bottom-[3px] z-[1] block h-[13px] border border-black bg-white"
                />
                <span className="absolute inset-x-0 bottom-0 z-[2] block h-[10px] border-t border-black bg-white" />
                <span
                  data-flap
                  className="absolute inset-x-0 top-0 z-[3] block h-[11px] bg-[#9a9a9a] [clip-path:polygon(0_0,50%_100%,100%_0)]"
                />
              </span>
              Questions?{" "}
              <a className={LINK} href="mailto:webmaster@animaxxing.com">
                E-mail the webmaster
              </a>{" "}
              ·{" "}
              <span className="text-[var(--web-link)] underline decoration-dotted" title="Under construction">
                Sign my guestbook
              </span>
            </p>

            <p
              data-web-intro
              data-updated
              className="mt-2 text-center font-mono text-[11px] text-muted"
            >
              Last updated: Friday, September 5, 1997 · Created with Notepad ·{" "}
              <span className="web-spin" aria-hidden="true">
                ✳
              </span>{" "}
              No frames version{" "}
              <span className="web-spin" aria-hidden="true">
                ✳
              </span>
            </p>
          </div>

          {/* What's New */}
          <div data-web-intro data-box="news" className={BOX}>
            <h2 className={BOX_HEAD}>What&rsquo;s New</h2>
            <ul className="m-0 list-disc pl-[18px] text-[13px]">
              <li data-web-intro data-news-item className="my-[3px]">
                <b>09/05</b> — Added the{" "}
                <Link className={LINK} href="/showcase/youtube">
                  Tube
                </Link>{" "}
                and{" "}
                <Link className={LINK} href="/showcase/etsy">
                  Made
                </Link>{" "}
                showcases.{" "}
                <span className="web-blink font-mono text-[11px] font-bold text-[var(--web-red)]">
                  NEW!
                </span>
              </li>
              <li data-web-intro data-news-item className="my-[3px]">
                <b>09/03</b> — Fast forward logo is finally animated!!
              </li>
              <li data-web-intro data-news-item className="my-[3px]">
                <b>09/01</b> — Page now works in Internet Explorer (sort of).
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
