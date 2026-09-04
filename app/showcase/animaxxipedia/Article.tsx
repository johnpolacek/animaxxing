"use client";

import { useRef, type ReactNode } from "react";
import {
  charsRiseIn,
  charsWeightWave,
  gsap,
  prefersReducedMotion,
  ScrollTrigger,
  scrollRevealBatch,
  useGSAP,
} from "@/components/motion";
import { Annotation, Label } from "@/components/ui";
import { startArms, type Arms } from "@/lib/animation/effects/arms";
import { startChromatophores } from "@/lib/animation/effects/chromatophores";
import { startHearts } from "@/lib/animation/effects/hearts";
import { createInk, INK_BLEED, type Ink } from "@/lib/animation/effects/ink";
import { jet } from "@/lib/animation/effects/jet";
import { speakIn } from "@/lib/animation/effects/speak";
import { primeSqueeze, squeezeIn } from "@/lib/animation/effects/squeeze";
import { watchPageTransition } from "@/lib/animation/pageState";
import {
  CHAPTERS,
  HATNOTE,
  INFOBOX_FIGURE,
  LEAD,
  LEAD_EMPHASIS,
  SEE_ALSO,
  SOURCE,
  SOURCES_CHAPTER,
  TAXONOMY,
  TEMPORAL_RANGE,
  type Chapter,
  type Fact,
  type Figure,
  type Subsection,
} from "./content";

/*
 * The article, animaxxed.
 *
 * Layout: a masthead the width of the page, then a twelve-column grid. The
 * lead runs seven columns wide beside the infobox ledger; below it a sticky
 * rail of chapter numbers sits in three columns and the chapters take the
 * other nine. Inside a chapter the prose keeps to a narrow measure with the
 * figures and the big numbers alongside.
 *
 * Motion, all of it drawn from the animal:
 *  - the masthead's letters scatter in with the route, then sway like arms
 *    and reach for the pointer; press the word and it jets off the page
 *    in a cloud of ink, then swims back
 *  - the lead is spoken, word by word; the ledger prints row by row
 *  - each chapter heading squeezes through a hairline gap and jets ink
 *  - the rail's marker jets between chapters, leaving a puff behind it
 *  - figures resolve out of the background, the way camouflage drops, and
 *    flash negative under the pointer like a warning display
 *  - the big numbers stamp down hard enough to shake their block
 *  - the three hearts beat, and the main one stops while the page moves
 *  - the camouflage title's letters never hold still, like living skin
 *  - chips wave their weight under the pointer; source chips stick like
 *    suckers and pop off again
 * Reduced motion snaps every one of these to its settled state.
 */

const WIKI_HISTORY = "https://en.wikipedia.org/w/index.php?title=Octopus&action=history";
const WIKI_TALK = "https://en.wikipedia.org/wiki/Talk:Octopus";
const WIKI_LANGUAGES = "https://www.wikidata.org/wiki/Q40152#sitelinks-wikipedia";

const CHIP =
  "inline-flex items-center gap-2 rounded-md border-2 px-3 py-1.5 font-mono text-caption font-bold uppercase tracking-[0.08em] transition-colors";
const CHIP_OUTLINE = `${CHIP} border-foreground text-foreground hover:bg-inverse hover:text-inverse-foreground`;
const CHIP_SOLID = `${CHIP} border-inverse bg-inverse text-inverse-foreground hover:bg-inverse-hover`;
const CHIP_ON_INVERSE = `${CHIP} border-inverse-foreground text-inverse-foreground hover:bg-inverse-foreground hover:text-inverse`;

const BUTTON =
  "inline-flex items-center rounded-lg px-6 py-3 font-sans text-2xl font-extrabold uppercase tracking-[-0.02em] transition-colors sm:px-8 sm:py-4 sm:text-4xl";
const BUTTON_PRIMARY = `${BUTTON} bg-inverse text-inverse-foreground hover:bg-inverse-hover`;
const BUTTON_SECONDARY = `${BUTTON} border-2 border-foreground text-foreground hover:bg-surface-hover`;

const DISPLAY =
  "font-sans font-extrabold uppercase leading-[0.88] tracking-[-0.04em] [font-kerning:none] [text-rendering:optimizeSpeed]";

/** Seconds between the masthead landing and the first spoken word. */
const SPEAK_DELAY = 0.25;
/** Seconds after a heading starts through the gap before the ink jets. */
const INK_DELAY = 0.3;

export function Article() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const root = scope.current;
      const masthead = root?.querySelector<HTMLElement>("[data-masthead]");
      const heading = root?.querySelector<HTMLElement>("h1");
      const lead = root?.querySelector<HTMLElement>("[data-speak-intro]");
      if (!root || !masthead || !heading || !lead || !contextSafe) {
        return;
      }
      const reduced = prefersReducedMotion();
      const q = gsap.utils.selector(root);
      const cleanups: (() => void)[] = [];

      /* ------------------------------------------------ masthead and lead */
      let arms: Arms | null = null;
      let speech: ReturnType<typeof speakIn> | null = null;
      let etymology: gsap.core.Timeline | null = null;

      const showEtymology = contextSafe(() => etymology?.play());
      const hideEtymology = contextSafe(() => etymology?.reverse());

      // The masthead's own ink, for the jet.
      const mastheadCanvas = masthead.querySelector<HTMLCanvasElement>("canvas[data-ink]");
      const mastheadInk = mastheadCanvas && !reduced ? createInk(mastheadCanvas, masthead) : null;
      let bolt: gsap.core.Timeline | null = null;
      const pressMasthead = contextSafe(() => {
        if (bolt || !arms) {
          return;
        }
        etymology?.reverse();
        arms.pause();
        const current = arms;
        bolt = jet({ heading, chars: current.chars, ink: mastheadInk, frame: masthead });
        bolt.eventCallback("onComplete", () => {
          bolt = null;
          current.resume();
        });
      });

      // The ledger prints after the page has settled; hide the rows until then.
      const rows = q<HTMLElement>("[data-ledger-row]");
      const eras = q<HTMLElement>("[data-era]");
      if (!reduced) {
        gsap.set(rows, { autoAlpha: 0, x: -10 });
        gsap.set(eras, { autoAlpha: 0, y: -6 });
      }

      const unwatch = watchPageTransition(heading, {
        onIdle: contextSafe(() => {
          speech = speakIn(lead, { emphasis: LEAD_EMPHASIS, delay: SPEAK_DELAY });
          arms = startArms(heading, { field: masthead });
          etymology = buildEtymology(masthead, arms.chars);
          if (!reduced) {
            const bar = root.querySelector<HTMLElement>("[data-range-bar]");
            if (bar) {
              gsap.fromTo(
                bar,
                { scaleX: 0, transformOrigin: "0% 50%" },
                { scaleX: 1, duration: 0.9, ease: "power3.inOut", delay: 0.6 },
              );
            }
            gsap.to(rows, { autoAlpha: 1, x: 0, duration: 0.3, ease: "power2.out", stagger: 0.07, delay: 0.3 });
            rows.forEach((row, i) => {
              const name = row.querySelector<HTMLElement>("[data-ledger-name]");
              if (name) {
                gsap.to(name, {
                  duration: 0.55,
                  delay: 0.3 + i * 0.07,
                  ease: "none",
                  scrambleText: { text: name.textContent ?? "", chars: "upperCase", speed: 0.5 },
                });
              }
            });
            gsap.to(eras, { autoAlpha: 1, y: 0, duration: 0.25, ease: "power2.out", stagger: 0.035, delay: 0.7 });
          }
          masthead.addEventListener("pointerenter", showEtymology);
          masthead.addEventListener("pointerleave", hideEtymology);
          heading.addEventListener("click", pressMasthead);
        }),
        onExiting: () => {
          speech?.timeline.kill();
          gsap.to(lead, { autoAlpha: 0, duration: 0.2 });
          etymology?.kill();
          bolt?.kill();
          bolt = null;
          // The route exit re-splits the heading, so leave the letters in place.
          arms?.stop(true);
          arms = null;
        },
      });

      /* ------------------------------------------------------- reveals */
      scrollRevealBatch(
        '[data-reveal]:not([data-reveal="camouflage"]):not([data-reveal="title"])',
        root,
      );

      let stopChromatophores: (() => void) | null = null;
      for (const header of q<HTMLElement>('[data-reveal="title"]')) {
        const title = header.querySelector<HTMLElement>("[data-title]");
        gsap.set(header, { autoAlpha: 1 });
        if (reduced || !title) {
          continue;
        }
        gsap.set(title, { autoAlpha: 0 });
        const living = title.hasAttribute("data-chromatophores");
        ScrollTrigger.create({
          trigger: header,
          start: "top 88%",
          once: true,
          onEnter: () => {
            if (!living) {
              charsRiseIn(title);
              return;
            }
            charsRiseIn(title, {
              onComplete: contextSafe(() => {
                // Living skin: runs only while the title is on screen.
                ScrollTrigger.create({
                  trigger: title,
                  start: "top bottom",
                  end: "bottom top",
                  onToggle: (self) => {
                    stopChromatophores?.();
                    stopChromatophores = self.isActive ? startChromatophores(title) : null;
                  },
                });
              }),
            });
          },
        });
      }

      for (const figure of q<HTMLElement>('[data-reveal="camouflage"]')) {
        const camo = figure.querySelector<HTMLElement>("[data-camo]");
        const caption = figure.querySelector<HTMLElement>("figcaption");
        gsap.set(figure, { autoAlpha: 1 });
        if (reduced || !camo) {
          continue;
        }
        gsap.set(camo, { clipPath: "inset(0 100% 0 0)", filter: "blur(16px)", scale: 1.05 });
        if (caption) {
          gsap.set(caption, { autoAlpha: 0 });
        }
        let revealed = false;
        ScrollTrigger.create({
          trigger: figure,
          start: "top 85%",
          once: true,
          onEnter: () => {
            const tl = gsap
              .timeline({ defaults: { overwrite: "auto" }, onComplete: () => (revealed = true) })
              .to(camo, { clipPath: "inset(0 0% 0 0)", duration: 0.7, ease: "power3.inOut" })
              .to(camo, { filter: "blur(0px)", scale: 1, duration: 1, ease: "power2.out" }, 0.2)
              .set(camo, { clearProps: "clipPath,filter,transform" });
            if (caption) {
              // The caption types itself out of noise once the picture is there.
              tl.set(caption, { autoAlpha: 1 }, 0.45).to(
                caption,
                {
                  duration: 0.7,
                  ease: "none",
                  scrambleText: { text: caption.textContent ?? "", chars: "upperCase", speed: 0.4 },
                },
                0.45,
              );
            }
          },
        });
        // Warning display: under the pointer the picture flashes negative, twice.
        const threaten = contextSafe(() => {
          if (!revealed) {
            return;
          }
          gsap
            .timeline({ defaults: { overwrite: "auto" } })
            .fromTo(camo, { scale: 1.035 }, { scale: 1, duration: 0.6, ease: "power2.out" }, 0)
            .to(camo, { filter: "invert(1)", duration: 0.06, ease: "none" }, 0)
            .to(camo, { filter: "invert(0)", duration: 0.1, ease: "none" }, 0.1)
            .to(camo, { filter: "invert(1)", duration: 0.06, ease: "none" }, 0.24)
            .to(camo, { filter: "invert(0)", duration: 0.25, ease: "power2.out" }, 0.32)
            .set(camo, { clearProps: "filter,transform" });
        });
        camo.addEventListener("pointerenter", threaten);
        cleanups.push(() => camo.removeEventListener("pointerenter", threaten));
      }

      for (const band of q<HTMLElement>("[data-band]")) {
        if (reduced) {
          continue;
        }
        gsap.set(band, { clipPath: "inset(0 100% 0 0)" });
        ScrollTrigger.create({
          trigger: band,
          start: "top 80%",
          once: true,
          onEnter: () =>
            gsap.to(band, {
              clipPath: "inset(0 0% 0 0)",
              duration: 0.8,
              ease: "power4.inOut",
              overwrite: "auto",
              clearProps: "clipPath",
            }),
        });
      }

      /* ------------------------------------------------- the big numbers */
      let stopHearts: (() => void) | null = null;
      const beginHearts = contextSafe((systemic: HTMLElement) => {
        stopHearts = startHearts({
          systemic,
          branchial: q<HTMLElement>('[data-heart="branchial"]'),
          status: root.querySelector<HTMLElement>("[data-heart-status]"),
        });
      });
      for (const value of q<HTMLElement>("[data-fact-value]")) {
        const text = value.textContent ?? "";
        const block = value.closest<HTMLElement>("[data-fact]");
        const isSystemic = value.dataset.heart === "systemic";
        if (reduced) {
          if (isSystemic) {
            beginHearts(value);
          }
          continue;
        }
        // Stamped: the number drops in from far too big and lands hard.
        gsap.set(value, { autoAlpha: 0, scale: 2.4, filter: "blur(12px)", transformOrigin: "0% 100%" });
        ScrollTrigger.create({
          trigger: value,
          start: "top 88%",
          once: true,
          onEnter: () => {
            const tl = gsap
              .timeline({ defaults: { overwrite: "auto" } })
              .to(value, { autoAlpha: 1, scale: 1, filter: "blur(0px)", duration: 0.42, ease: "expo.in" })
              .to(
                value,
                {
                  duration: 0.8,
                  ease: "none",
                  scrambleText: { text, chars: "0123456789", speed: 0.5, revealDelay: 0.3 },
                },
                0.1,
              )
              .set(value, { clearProps: "filter,transform" }, 0.42);
            if (block) {
              tl.to(
                block,
                { x: () => gsap.utils.random(-7, 7), y: () => gsap.utils.random(-3, 3), duration: 0.03, repeat: 6, yoyo: true, ease: "none" },
                0.42,
              ).set(block, { x: 0, y: 0 });
            }
            if (isSystemic) {
              tl.call(() => beginHearts(value), [], ">");
            }
          },
        });
      }

      /* ------------------------------------------- chapters and the rail */
      const links = q<HTMLElement>("[data-rail-link]");
      const marker = root.querySelector<HTMLElement>("[data-rail-marker]");
      const rail = root.querySelector<HTMLElement>("[data-rail]");
      const railCanvas = rail?.querySelector<HTMLCanvasElement>("canvas[data-ink]");
      const railInk = rail && railCanvas && !reduced ? createInk(railCanvas, rail) : null;
      if (marker) {
        gsap.set(marker, { autoAlpha: 0 });
      }
      let active = -1;
      const jetTo = (index: number) => {
        if (index === active) {
          return;
        }
        const from = active;
        active = index;
        links.forEach((link, i) => {
          link.dataset.active = String(i === index);
        });
        const link = links[index];
        if (!marker || !link) {
          return;
        }
        if (reduced) {
          gsap.set(marker, { y: link.offsetTop, autoAlpha: 1 });
          return;
        }
        // The push leaves a puff of ink behind, out of the end the marker is leaving from.
        if (from >= 0 && railInk && rail) {
          const wasAt = Number(gsap.getProperty(marker, "y"));
          const down = link.offsetTop > wasAt;
          railInk.squirt(
            rail.offsetWidth * 0.5,
            wasAt + (down ? 4 : marker.offsetHeight - 4),
            { angle: down ? -Math.PI / 2 : Math.PI / 2, strength: 0.28 },
          );
        }
        // Jet propulsion: a hard push off, a fast glide, and a settle.
        gsap
          .timeline({ defaults: { overwrite: "auto" } })
          .to(marker, { autoAlpha: 1, duration: 0.1 }, 0)
          .to(marker, { y: link.offsetTop, duration: 0.55, ease: "expo.out" }, 0)
          .fromTo(
            marker,
            { scaleY: 0.72, scaleX: 1.04, transformOrigin: "50% 50%" },
            { scaleY: 1, scaleX: 1, duration: 0.5, ease: "back.out(2.2)" },
            0.04,
          );
      };

      const inks: Ink[] = [];
      q<HTMLElement>("[data-chapter]").forEach((section, index) => {
        const h2 = section.querySelector<HTMLElement>("[data-squeeze]");
        const gap = section.querySelector<HTMLElement>("[data-gap]");
        const frame = section.querySelector<HTMLElement>("[data-ink-frame]");
        const canvas = section.querySelector<HTMLCanvasElement>("canvas[data-ink]");
        if (!h2) {
          return;
        }
        primeSqueeze(h2, { gap });
        const ink = canvas && frame && !reduced ? createInk(canvas, frame) : null;
        if (ink) {
          inks.push(ink);
        }
        ScrollTrigger.create({
          trigger: section,
          start: "top 78%",
          once: true,
          onEnter: () => {
            squeezeIn(h2, { gap });
            if (ink && frame) {
              gsap.delayedCall(INK_DELAY, () => ink.squirt(0, frame.offsetHeight / 2));
            }
          },
        });
        ScrollTrigger.create({
          trigger: section,
          start: "top 45%",
          end: "bottom 45%",
          onToggle: (self) => {
            if (self.isActive) {
              jetTo(index);
            }
          },
        });
      });

      /* ------------------------------------------------------------ chips */
      for (const chip of q<HTMLElement>("[data-chip]")) {
        const label = chip.querySelector<HTMLElement>("[data-chip-label]") ?? chip;
        // One wave per visit: putting the split text back makes Chrome fire
        // pointerenter again, so the chip re-arms only once the pointer leaves.
        let armed = true;
        const wave = contextSafe(() => {
          if (reduced || !armed) {
            return;
          }
          armed = false;
          charsWeightWave(label);
        });
        const rearm = () => {
          armed = true;
        };
        chip.addEventListener("pointerenter", wave);
        chip.addEventListener("pointerleave", rearm);
        chip.addEventListener("focus", wave);
        chip.addEventListener("blur", rearm);
        cleanups.push(() => {
          chip.removeEventListener("pointerenter", wave);
          chip.removeEventListener("pointerleave", rearm);
          chip.removeEventListener("focus", wave);
          chip.removeEventListener("blur", rearm);
        });
      }

      /* ---------------------------------------------------------- suckers */
      let held: HTMLElement | null = null;
      const attach = contextSafe((event: PointerEvent) => {
        const chip = (event.target as Element | null)?.closest<HTMLElement>("[data-sucker]");
        if (!chip || reduced) {
          return;
        }
        held = chip;
        gsap.to(chip, {
          scale: 0.86,
          duration: 0.12,
          ease: "power3.out",
          transformOrigin: "50% 50%",
          overwrite: "auto",
        });
      });
      const release = contextSafe(() => {
        if (!held) {
          return;
        }
        gsap.to(held, {
          scale: 1,
          duration: 0.6,
          ease: "elastic.out(1.2, 0.4)",
          overwrite: "auto",
          clearProps: "transform",
        });
        held = null;
      });
      root.addEventListener("pointerdown", attach);
      window.addEventListener("pointerup", release);
      window.addEventListener("pointercancel", release);

      return () => {
        unwatch();
        masthead.removeEventListener("pointerenter", showEtymology);
        masthead.removeEventListener("pointerleave", hideEtymology);
        heading.removeEventListener("click", pressMasthead);
        root.removeEventListener("pointerdown", attach);
        window.removeEventListener("pointerup", release);
        window.removeEventListener("pointercancel", release);
        cleanups.forEach((fn) => fn());
        speech?.timeline.kill();
        speech?.revert();
        etymology?.kill();
        bolt?.kill();
        arms?.stop();
        stopHearts?.();
        stopChromatophores?.();
        mastheadInk?.destroy();
        railInk?.destroy();
        inks.forEach((ink) => ink.destroy());
      };
    },
    { scope },
  );

  return (
    <div ref={scope} className="@container">
      {/* Wikipedia's chrome, as chips. */}
      <div
        data-page-transition
        className="flex flex-col gap-6 border-b border-border pb-6 lg:flex-row lg:items-start lg:justify-between"
      >
        <Annotation className="max-w-[60ch]">{HATNOTE}</Annotation>
        <nav aria-label="Wikipedia" className="flex flex-wrap gap-2">
          <a data-chip className={CHIP_SOLID} href={SOURCE.url} target="_blank" rel="noreferrer">
            <span data-chip-label>Article</span>
          </a>
          <a data-chip className={CHIP_OUTLINE} href={WIKI_TALK} target="_blank" rel="noreferrer">
            <span data-chip-label>Talk</span>
          </a>
          <a data-chip className={CHIP_OUTLINE} href={WIKI_HISTORY} target="_blank" rel="noreferrer">
            <span data-chip-label>View history</span>
          </a>
          <a data-chip className={CHIP_OUTLINE} href={WIKI_LANGUAGES} target="_blank" rel="noreferrer">
            <span data-chip-label>{SOURCE.languages} languages</span>
          </a>
        </nav>
      </div>

      <p
        data-page-transition
        className="mt-10 font-mono text-caption uppercase tracking-[0.08em] text-muted"
      >
        Animaxxipedia <span aria-hidden="true">/</span> The free encyclopedia, animaxxed{" "}
        <span aria-hidden="true">/</span> Order Octopoda <span aria-hidden="true">/</span> Leach,
        1818
      </p>

      {/* Masthead */}
      <div data-masthead className="relative mt-2">
        <h1
          data-page-transition="letters"
          title="Press to jet"
          className={`${DISPLAY} -ml-[0.04em] cursor-pointer text-[clamp(4rem,19.5cqi,20rem)] leading-[0.82] tracking-[-0.055em] select-none`}
        >
          Octopus
        </h1>
        <canvas
          data-ink
          aria-hidden="true"
          className="pointer-events-none absolute z-10 text-muted"
          style={{ left: -INK_BLEED, top: -INK_BLEED }}
        />
        <div data-etymology aria-hidden="true" className="pointer-events-none relative mt-3 h-12">
          <div data-ety="octo" className="absolute top-0 left-0 w-1/2">
            <span data-ety-line className="block h-0.5 w-full bg-foreground" />
            <span
              data-ety-label
              className="mt-2 block font-mono text-annotation uppercase tracking-[0.12em] text-muted"
            >
              ὀκτώ <span aria-hidden="true">·</span> oktō <span aria-hidden="true">·</span> eight
            </span>
          </div>
          <div data-ety="pus" className="absolute top-0 left-1/2 w-1/2">
            <span data-ety-line className="block h-0.5 w-full bg-foreground" />
            <span
              data-ety-label
              className="mt-2 block font-mono text-annotation uppercase tracking-[0.12em] text-muted"
            >
              πούς <span aria-hidden="true">·</span> pous <span aria-hidden="true">·</span> foot
            </span>
          </div>
        </div>
      </div>

      {/* Lead and infobox */}
      <div className="mt-8 grid grid-cols-12 gap-x-6 gap-y-12 border-t border-border pt-8">
        <div className="col-span-12 lg:col-span-7">
          <p
            data-speak-intro
            className="max-w-[46ch] font-sans text-title leading-[1.3] text-foreground sm:text-display sm:leading-[1.3]"
          >
            {LEAD}
          </p>
          <ul data-page-transition className="mt-8 flex flex-wrap gap-2" aria-label="At a glance">
            <li>
              <a data-chip className={CHIP_OUTLINE} href="#external">
                <span data-chip-label>Eight arms</span>
              </a>
            </li>
            <li>
              <a data-chip className={CHIP_OUTLINE} href="#circulation">
                <span data-chip-label>Three hearts</span>
              </a>
            </li>
            <li>
              <a data-chip className={CHIP_OUTLINE} href="#habitat">
                <span data-chip-label>300 species</span>
              </a>
            </li>
            <li>
              <a data-chip className={CHIP_OUTLINE} href="#nervous">
                <span data-chip-label>One brain, mostly in the arms</span>
              </a>
            </li>
            <li>
              <a data-chip className={CHIP_OUTLINE} href="#danger">
                <span data-chip-label>Venomous, all of them</span>
              </a>
            </li>
          </ul>
        </div>

        <aside
          data-page-transition
          aria-label="Classification"
          className="col-span-12 lg:col-span-5 lg:col-start-8"
        >
          <FigureBlock figure={INFOBOX_FIGURE} eager />
          <dl className="mt-8 border-t border-border">
            {TAXONOMY.map((row) => (
              <div
                key={row.rank}
                data-ledger-row
                className="grid grid-cols-[7rem_1fr] gap-x-4 border-b border-border py-2"
              >
                <dt className="font-mono text-annotation uppercase leading-5 text-muted">
                  {row.rank}
                </dt>
                <dd className="font-sans text-body leading-5">
                  <span data-ledger-name className="font-extrabold">
                    {row.name}
                  </span>
                  {row.note ? (
                    <span className="ml-2 font-mono text-annotation uppercase text-muted">
                      {row.note}
                    </span>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-8">
            <Label as="p">Temporal range</Label>
            <div className="relative mt-3 h-6 border-b border-border">
              <div
                data-range-bar
                className="absolute bottom-0 h-3 bg-inverse"
                style={{
                  left: `${TEMPORAL_RANGE.start * 100}%`,
                  width: `${(1 - TEMPORAL_RANGE.start) * 100}%`,
                }}
              />
              {["PreꞒ", "Ꞓ", "O", "S", "D", "C", "P", "T", "J", "K", "Pg", "N"].map((era, i) => (
                <span
                  key={era}
                  data-era
                  aria-hidden="true"
                  className="absolute top-0 -translate-x-1/2 font-mono text-[0.6rem] uppercase text-muted"
                  style={{ left: `${(i / 12) * 100 + 4}%` }}
                >
                  {era}
                </span>
              ))}
            </div>
            <div className="mt-2 flex justify-between">
              <Annotation>
                {TEMPORAL_RANGE.from}, {TEMPORAL_RANGE.fromAge}
              </Annotation>
              <Annotation>{TEMPORAL_RANGE.to}</Annotation>
            </div>
          </div>
        </aside>
      </div>

      {/* Chapters */}
      <div className="mt-section grid grid-cols-12 gap-x-6">
        <nav
          data-page-transition
          aria-label="Contents"
          className="sticky top-8 hidden self-start lg:col-span-3 lg:block"
        >
          <Label as="p" className="mb-4 block">
            Contents
          </Label>
          <ol data-rail className="relative">
            <canvas
              data-ink
              aria-hidden="true"
              className="pointer-events-none absolute z-20 text-muted"
              style={{ left: -INK_BLEED, top: -INK_BLEED }}
            />
            <span
              data-rail-marker
              aria-hidden="true"
              className="absolute top-0 left-0 h-9 w-full rounded-md bg-inverse"
            />
            {[...CHAPTERS, SOURCES_CHAPTER].map((chapter) => (
              <li key={chapter.id}>
                <a
                  data-rail-link
                  data-chip
                  href={`#${chapter.id}`}
                  className="relative z-10 flex h-9 items-center gap-4 rounded-md px-3 font-mono text-caption font-bold uppercase tracking-[0.08em] text-muted transition-colors hover:text-foreground data-[active=true]:text-inverse-foreground"
                >
                  <span>{chapter.number}</span>
                  <span data-chip-label>{chapter.short}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="col-span-12 lg:col-span-9">
          {CHAPTERS.map((chapter) => (
            <ChapterBlock key={chapter.id} chapter={chapter} />
          ))}
          <SourcesBlock />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- pieces */

function ChapterBlock({ chapter }: { chapter: Chapter }) {
  return (
    <section
      id={chapter.id}
      data-chapter
      className="scroll-mt-8 border-t border-border pt-6 [&+&]:mt-section"
    >
      <p data-reveal className="font-mono text-caption uppercase tracking-[0.08em] text-muted">
        {chapter.number} <span aria-hidden="true">/</span> {chapter.title}
      </p>
      <div data-ink-frame className="relative mt-4">
        <span
          data-gap
          aria-hidden="true"
          className="absolute top-1/2 left-0 h-px w-full bg-foreground"
        />
        <h2 data-squeeze className={`${DISPLAY} text-[clamp(2.75rem,8.5cqi,7.5rem)]`}>
          {chapter.title}
        </h2>
        <canvas
          data-ink
          aria-hidden="true"
          className="pointer-events-none absolute z-10 text-muted"
          style={{ left: -INK_BLEED, top: -INK_BLEED }}
        />
      </div>
      {chapter.subsections.length > 1 ? (
        <ul data-reveal className="mt-6 flex flex-wrap gap-2" aria-label="In this chapter">
          {chapter.subsections.map((sub) => (
            <li key={sub.id}>
              <a data-chip className={CHIP_OUTLINE} href={`#${sub.id}`}>
                <span data-chip-label>{sub.title}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      {chapter.subsections.map((sub, index) => (
        <SubsectionBlock key={sub.id} chapter={chapter} sub={sub} index={index} />
      ))}
    </section>
  );
}

function SubsectionBlock({
  chapter,
  sub,
  index,
}: {
  chapter: Chapter;
  sub: Subsection;
  index: number;
}) {
  const inverted = sub.inverted === true;
  const tone = inverted ? "inverse" : "muted";
  return (
    <article
      id={sub.id}
      data-band={inverted ? "" : undefined}
      className={[
        "mt-12 grid scroll-mt-8 grid-cols-9 gap-x-6 gap-y-6",
        inverted ? "rounded-xl bg-inverse p-6 text-inverse-foreground sm:p-8" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header data-reveal="title" className="col-span-9">
        <h3 className="flex items-baseline gap-4">
          <span
            className={`font-mono text-caption uppercase tracking-[0.08em] ${inverted ? "text-inverse-foreground/75" : "text-muted"}`}
          >
            {chapter.number}.{index + 1}
          </span>
          <span
            data-title
            data-chromatophores={inverted ? "" : undefined}
            className="font-sans text-title font-extrabold tracking-[-0.01em]"
          >
            {sub.title}
          </span>
        </h3>
      </header>

      <div className="col-span-9 md:col-span-5">
        {sub.paragraphs.map((paragraph, i) => (
          <p
            key={i}
            data-reveal
            className={`max-w-[46ch] font-sans text-body text-pretty ${i > 0 ? "mt-5" : ""}`}
          >
            {paragraph}
          </p>
        ))}
        <p data-reveal className="mt-6">
          <a
            data-sucker
            data-chip
            className={inverted ? CHIP_ON_INVERSE : CHIP_OUTLINE}
            href={`${SOURCE.url}#${sub.anchor}`}
            target="_blank"
            rel="noreferrer"
          >
            <span data-chip-label>Sources</span> <span aria-hidden="true">·</span> Wikipedia
          </a>
        </p>
      </div>

      {sub.figure ? (
        <div
          className={
            sub.figure.bleed ? "col-span-9 md:mt-2" : "col-span-9 md:col-span-4 md:col-start-6"
          }
        >
          <FigureBlock figure={sub.figure} inverted={inverted} />
        </div>
      ) : null}

      {sub.fact ? <FactBlock fact={sub.fact} tone={tone} /> : null}
    </article>
  );
}

function FigureBlock({
  figure,
  inverted = false,
  eager = false,
}: {
  figure: Figure;
  inverted?: boolean;
  eager?: boolean;
}) {
  return (
    <figure data-reveal={eager ? undefined : "camouflage"}>
      <div
        data-camo
        className={`overflow-hidden rounded-lg border ${inverted ? "border-inverse-foreground/25" : "border-border"}`}
        style={{ aspectRatio: figure.aspect }}
      >
        {/* Wikimedia Commons serves these; next/image would need the host allow-listed for no gain here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={figure.src}
          alt={figure.alt}
          loading={eager ? "eager" : "lazy"}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover grayscale contrast-125"
        />
      </div>
      <figcaption
        className={`mt-2 font-mono text-annotation uppercase ${inverted ? "text-inverse-foreground/75" : "text-muted"}`}
      >
        {figure.caption}
      </figcaption>
    </figure>
  );
}

function FactBlock({ fact, tone }: { fact: Fact; tone: "muted" | "inverse" }) {
  const rule = tone === "inverse" ? "border-inverse-foreground/25" : "border-border";
  return (
    <div data-fact data-reveal className={`col-span-9 border-t ${rule} pt-4`}>
      <p
        className={`${DISPLAY} flex items-baseline text-[clamp(4rem,11cqi,10rem)] leading-[0.85] tracking-[-0.05em]`}
      >
        <span
          data-fact-value
          data-heart={fact.hearts ? "systemic" : undefined}
          className="inline-block"
        >
          {fact.value}
        </span>
        {fact.unit ? (
          <span className="ml-[0.1em] text-[0.38em] tracking-[-0.02em]">{fact.unit}</span>
        ) : null}
      </p>
      <Annotation tone={tone} className="mt-3">
        {fact.label}
      </Annotation>
      {fact.hearts ? (
        <div
          className={`mt-3 flex flex-wrap items-baseline gap-4 font-mono text-annotation uppercase ${tone === "inverse" ? "text-inverse-foreground/75" : "text-muted"}`}
        >
          <span data-heart="branchial" className="inline-block font-bold text-foreground">
            Branchial
          </span>
          <span data-heart="branchial" className="inline-block font-bold text-foreground">
            Branchial
          </span>
          <span>
            Systemic: <span data-heart-status>at rest</span>
          </span>
        </div>
      ) : null}
    </div>
  );
}

function SourcesBlock() {
  const rows: { term: string; detail: ReactNode }[] = [
    {
      term: "Source article",
      detail: (
        <a className="underline decoration-1 underline-offset-4" href={SOURCE.url} target="_blank" rel="noreferrer">
          Wikipedia, “Octopus”
        </a>
      ),
    },
    {
      term: "Licence",
      detail: (
        <a
          className="underline decoration-1 underline-offset-4"
          href={SOURCE.licenseUrl}
          target="_blank"
          rel="noreferrer"
        >
          {SOURCE.license}
        </a>
      ),
    },
    { term: "Retrieved", detail: SOURCE.retrieved },
    { term: "Citations in source", detail: String(SOURCE.citations) },
    { term: "Languages", detail: String(SOURCE.languages) },
    { term: "This page", detail: "A condensed retelling. Every subsection links to its sourced original." },
  ];
  return (
    <section
      id={SOURCES_CHAPTER.id}
      data-chapter
      className="mt-section scroll-mt-8 border-t border-border pt-6"
    >
      <p data-reveal className="font-mono text-caption uppercase tracking-[0.08em] text-muted">
        {SOURCES_CHAPTER.number} <span aria-hidden="true">/</span> See also, notes, references,
        external links
      </p>
      <div data-ink-frame className="relative mt-4">
        <span
          data-gap
          aria-hidden="true"
          className="absolute top-1/2 left-0 h-px w-full bg-foreground"
        />
        <h2 data-squeeze className={`${DISPLAY} text-[clamp(2.75rem,8.5cqi,7.5rem)]`}>
          {SOURCES_CHAPTER.title}
        </h2>
        <canvas
          data-ink
          aria-hidden="true"
          className="pointer-events-none absolute z-10 text-muted"
          style={{ left: -INK_BLEED, top: -INK_BLEED }}
        />
      </div>

      <dl className="mt-10 border-t border-border">
        {rows.map((row) => (
          <div
            key={row.term}
            data-reveal
            className="grid grid-cols-9 gap-x-6 border-b border-border py-3"
          >
            <dt className="col-span-9 font-mono text-annotation uppercase leading-5 text-muted md:col-span-3">
              {row.term}
            </dt>
            <dd className="col-span-9 max-w-[46ch] font-sans text-body leading-5 md:col-span-6">
              {row.detail}
            </dd>
          </div>
        ))}
      </dl>

      <div data-reveal className="mt-10">
        <Label as="p">See also</Label>
        <ul className="mt-3 flex flex-wrap gap-2">
          {SEE_ALSO.map((title) => (
            <li key={title}>
              <a
                data-sucker
                data-chip
                className={CHIP_OUTLINE}
                href={`https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`}
                target="_blank"
                rel="noreferrer"
              >
                <span data-chip-label>{title}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div data-reveal className="mt-12 flex flex-wrap gap-4">
        <a className={BUTTON_PRIMARY} href={SOURCE.url} target="_blank" rel="noreferrer">
          Read the source
        </a>
        <a className={BUTTON_SECONDARY} href="#top">
          Back to top
        </a>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- etymology */

/**
 * Positions the two brackets under the letters they explain, OCTO and PUS,
 * and builds the paused reveal that hovering the masthead plays. Without the
 * letters (reduced motion) there is nothing to measure and the row stays out.
 */
function buildEtymology(masthead: HTMLElement, chars: HTMLElement[]): gsap.core.Timeline | null {
  const row = masthead.querySelector<HTMLElement>("[data-etymology]");
  const octo = masthead.querySelector<HTMLElement>('[data-ety="octo"]');
  const pus = masthead.querySelector<HTMLElement>('[data-ety="pus"]');
  if (!row || !octo || !pus || chars.length < 7) {
    return null;
  }
  const base = masthead.getBoundingClientRect().left;
  /** Daylight between the two brackets, so they read as two and not one line. */
  const gap = 20;
  const span = (from: number, to: number) => {
    const first = chars[from]?.getBoundingClientRect();
    const last = chars[to]?.getBoundingClientRect();
    if (!first || !last) {
      return;
    }
    return { left: first.left - base, width: last.right - first.left - gap };
  };
  const a = span(0, 3);
  const b = span(4, 6);
  if (!a || !b) {
    return null;
  }
  octo.style.left = `${a.left}px`;
  octo.style.width = `${a.width}px`;
  pus.style.left = `${b.left}px`;
  pus.style.width = `${b.width}px`;

  const lines = row.querySelectorAll<HTMLElement>("[data-ety-line]");
  const labels = row.querySelectorAll<HTMLElement>("[data-ety-label]");
  // The fromTo pairs below render their start values at once, so the row can
  // be shown now with its lines at zero width and its labels clear.
  const timeline = gsap
    .timeline({ paused: true, defaults: { overwrite: "auto" } })
    // The compound comes apart: OCTO steps left, PUS steps right.
    .to(chars.slice(0, 4), { x: -12, duration: 0.4, ease: "power3.out" }, 0)
    .to(chars.slice(4), { x: 12, duration: 0.4, ease: "power3.out" }, 0)
    .fromTo(
      lines,
      { scaleX: 0, transformOrigin: "0% 50%" },
      { scaleX: 1, duration: 0.35, ease: "power3.out", stagger: 0.08 },
    )
    .fromTo(
      labels,
      { autoAlpha: 0, y: 6 },
      { autoAlpha: 1, y: 0, duration: 0.3, ease: "power2.out", stagger: 0.08 },
      0.12,
    );
  gsap.set(row, { autoAlpha: 1 });
  return timeline;
}
