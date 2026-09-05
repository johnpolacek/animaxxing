"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  charsRiseIn,
  charsWeightWave,
  gsap,
  prefersReducedMotion,
  ScrollTrigger,
  scrollRevealBatch,
  useGSAP,
} from "@/components/motion";
import { Flip } from "@/components/motion/gsap";
import { ParticleButton, type ParticleButtonHandle } from "@/app/ParticleButton";
import { reactor } from "@/lib/animation/effects/particleButtons";
import { watchPageTransition } from "@/lib/animation/pageState";
import {
  CART_START,
  CATEGORIES,
  CHAPTERS,
  dollars,
  ITEM,
  ITEM_DETAIL,
  LISTINGS,
  SHIPPING,
  SHOP,
  TAX,
  TODAY,
  type CartLine,
  type Listing,
  type Photo,
} from "./content";

/*
 * The marketplace, animaxxed.
 *
 * Layout: a sticky strip of chrome (wordmark, search, the cart), then a
 * twelve-column grid with a sticky rail of the four chapters in two columns
 * and the chapters themselves in the other ten. In every chapter the
 * photograph is the hero: it takes the wide column and is cropped hard at
 * the gutter, and the type is set around it.
 *
 * Motion, all of it drawn from buying something handmade:
 *  - every photograph develops like a print: it comes in from the top out
 *    of a blur, and the frame settles as it sharpens
 *  - prices resolve out of digits; the chapter's numbers print as it opens
 *  - the category chips refile the grid: cards slide to their new places,
 *    the ones that no longer fit shrink away
 *  - hearting a listing makes the heart jump
 *  - the item's other angles swap into the hero, which develops again
 *  - Add to cart is a reactor: sparks collapse into it and it gives off
 *    embers. Pressing it sends the photograph flying into the cart, and the
 *    count in the chrome jumps and resolves
 *  - the shop's stars draw themselves, review by review
 *  - cart lines print in; taking one out folds it shut and the totals
 *    resolve to the new sum; checking out clears the ledger and thanks you
 *  - the rail's marker drifts between chapters
 * Reduced motion snaps every one of these to its settled state.
 */

const MONO_LABEL = "font-mono text-caption font-bold uppercase tracking-[0.08em]";
const MONO_NOTE = "font-mono text-annotation uppercase tracking-[0.08em]";

const CHIP =
  "inline-flex h-9 items-center gap-2 rounded-md border-2 px-3.5 font-mono text-caption font-bold uppercase tracking-[0.08em] transition-colors";
const CHIP_OUTLINE = `${CHIP} border-foreground text-foreground hover:bg-surface-hover`;
const CHIP_TOGGLE = `${CHIP} border-foreground text-foreground hover:bg-surface-hover aria-pressed:border-inverse aria-pressed:bg-inverse aria-pressed:text-inverse-foreground aria-pressed:hover:bg-inverse-hover`;
const CHIP_RAIL = `${CHIP} shrink-0 border-foreground text-foreground data-[active=true]:border-inverse data-[active=true]:bg-inverse data-[active=true]:text-inverse-foreground`;
const CHIP_SMALL =
  "inline-flex h-7 items-center rounded-sm border border-foreground px-2 font-mono text-annotation font-bold uppercase tracking-[0.08em]";

const BUTTON =
  "inline-flex cursor-pointer items-center justify-center rounded-lg px-6 py-3 font-sans text-2xl font-extrabold uppercase tracking-[-0.02em] transition-colors sm:px-8 sm:py-4 sm:text-3xl";
const BUTTON_PRIMARY = `${BUTTON} bg-inverse text-inverse-foreground hover:bg-inverse-hover disabled:cursor-default disabled:hover:bg-inverse`;
const BUTTON_SECONDARY = `${BUTTON} border-2 border-foreground text-foreground hover:bg-surface-hover`;

const DISPLAY =
  "font-sans font-extrabold uppercase leading-[0.88] tracking-[-0.04em] [font-kerning:none] [text-rendering:optimizeSpeed]";
const TITLE = "font-sans font-extrabold leading-[1.02] tracking-[-0.03em] text-pretty";
const PRICE = "font-sans font-extrabold tracking-[-0.03em] tabular-nums";
const PHOTO = "absolute inset-0 h-full w-full object-cover grayscale contrast-125";
const STEP =
  "inline-flex size-8 cursor-pointer items-center justify-center rounded-sm border border-foreground font-mono text-caption font-bold transition-colors hover:bg-surface-hover disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent";

type Category = (typeof CATEGORIES)[number];

/** The browse grid: every listing but the featured one. */
const FEATURED = LISTINGS[0]!;
const GRID = LISTINGS.slice(1);

/** The item's photographs, the listing's own first. */
const ANGLES: Photo[] = [ITEM.photo, ...ITEM_DETAIL.angles];

let orderNumber = 48211;

/** The key a cart line renders under: the listing and the option chosen. */
function lineKey(line: CartLine): string {
  return `${line.listing.id}-${line.option ?? ""}`;
}

/* --------------------------------------------------------------- motion */

/** A print developing: the photograph comes in from the top out of a blur while its frame settles. */
function develop(photo: HTMLElement, at = 0, tl?: gsap.core.Timeline): void {
  const img = photo.querySelector("img");
  const target = tl ?? gsap.timeline();
  target.fromTo(
    photo,
    { clipPath: "inset(0 0 100% 0)", filter: "blur(14px)" },
    {
      clipPath: "inset(0 0 0% 0)",
      filter: "blur(0px)",
      duration: 1,
      ease: "power3.out",
      clearProps: "clipPath,filter",
      overwrite: "auto",
    },
    at,
  );
  if (img) {
    target.fromTo(
      img,
      { scale: 1.08, transformOrigin: "50% 50%" },
      { scale: 1, duration: 1.5, ease: "power2.out", clearProps: "transform", overwrite: "auto" },
      at,
    );
  }
}

/** Digits resolving out of noise into whatever the element now says. */
function resolve(element: HTMLElement, at = 0, tl?: gsap.core.Timeline): void {
  const vars: gsap.TweenVars = {
    duration: 0.55,
    ease: "none",
    overwrite: "auto",
    scrambleText: {
      text: element.textContent ?? "",
      chars: "0123456789",
      speed: 0.5,
      revealDelay: 0.12,
    },
  };
  if (tl) {
    tl.to(element, vars, at);
  } else {
    gsap.to(element, { ...vars, delay: at });
  }
}

/** A jump: the element leaps up in size and settles back. */
function jump(element: Element, strength = 1.3): void {
  gsap.fromTo(
    element,
    { scale: strength, transformOrigin: "50% 50%" },
    { scale: 1, duration: 0.6, ease: "elastic.out(1, 0.45)", clearProps: "transform", overwrite: "auto" },
  );
}

/** Draws every tagged stroke in `scope` along its own length, then fills what should be filled. */
function drawStrokes(scope: Element, at = 0, tl?: gsap.core.Timeline): void {
  const strokes = Array.from(scope.querySelectorAll<SVGGeometryElement>("[data-stroke]"));
  if (strokes.length === 0) {
    return;
  }
  const target = tl ?? gsap.timeline();
  for (const stroke of strokes) {
    const length = stroke.getTotalLength();
    stroke.style.strokeDasharray = `${length}`;
    stroke.style.strokeDashoffset = `${length}`;
  }
  target.to(
    strokes,
    {
      strokeDashoffset: 0,
      duration: 0.5,
      stagger: 0.06,
      ease: "power2.inOut",
      overwrite: "auto",
      onComplete: () => {
        for (const stroke of strokes) {
          stroke.style.strokeDasharray = "";
          stroke.style.strokeDashoffset = "";
        }
      },
    },
    at,
  );
  const filled = strokes.filter((stroke) => stroke.dataset.filled !== undefined);
  if (filled.length > 0) {
    target.fromTo(
      filled,
      { fillOpacity: 0 },
      { fillOpacity: 1, duration: 0.3, stagger: 0.06, ease: "power2.out", clearProps: "fillOpacity" },
      at + 0.25,
    );
  }
}

/* ---------------------------------------------------------------- page */

export function Made() {
  const scope = useRef<HTMLDivElement>(null);
  const addButton = useRef<ParticleButtonHandle>(null);

  const [category, setCategory] = useState<Category>("All");
  const [favorites, setFavorites] = useState<Set<string>>(
    () => new Set(LISTINGS.filter((listing) => listing.favorite).map((listing) => listing.id)),
  );
  const [angle, setAngle] = useState(0);
  const [option, setOption] = useState<number>(ITEM_DETAIL.options.initial);
  const [cart, setCart] = useState<CartLine[]>(CART_START);
  const [placed, setPlaced] = useState<string | null>(null);
  /** The key of the line that was just added, so it can print in on top. */
  const [fresh, setFresh] = useState<string | null>(null);

  const idle = useRef(false);
  const cartRef = useRef(cart);
  cartRef.current = cart;
  const previousCart = useRef(cart);
  const previousAngle = useRef(angle);
  const previousOption = useRef(option);
  const previousPlaced = useRef(placed);
  const itemArmed = useRef(false);

  const choice = ITEM_DETAIL.options.choices[option] ?? ITEM_DETAIL.options.choices[0]!;
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cart.reduce((sum, line) => sum + line.listing.price * line.quantity, 0);
  const shipping = cart.length > 0 ? SHIPPING : 0;
  const tax = Math.round(subtotal * TAX);
  const total = subtotal + shipping + tax;

  /* ------------------------------------------------ mount: the page */
  useGSAP(
    (_context, contextSafe) => {
      const root = scope.current;
      if (!root || !contextSafe) {
        return;
      }
      const reduced = prefersReducedMotion();
      const q = gsap.utils.selector(root);
      const cleanups: (() => void)[] = [];
      const sections = q<HTMLElement>("[data-chapter]");
      const marker = root.querySelector<HTMLElement>("[data-rail-marker]");
      const links = q<HTMLElement>("[data-rail-link]");
      const rules = q<HTMLElement>("[data-rule]");

      if (marker) {
        gsap.set(marker, { autoAlpha: 0 });
      }
      if (!reduced) {
        gsap.set(rules, { scaleX: 0, transformOrigin: "0% 50%" });
      }

      /**
       * A chapter opens: its hairline draws across, its title rises, its
       * pieces arrive, its photograph develops, and its numbers print.
       */
      const chapterIn = (section: HTMLElement, { title = true } = {}): gsap.core.Timeline => {
        const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
        const heading = section.querySelector<HTMLElement>("[data-title]");
        const rule = section.querySelector<HTMLElement>("[data-rule]");
        const pieces = Array.from(section.querySelectorAll<HTMLElement>("[data-arrive]:not([data-browse-categories])"));
        const categories = section.querySelector<HTMLElement>("[data-browse-categories]");
        const heroes = Array.from(section.querySelectorAll<HTMLElement>("[data-photo='hero']"));
        const live = Array.from(section.querySelectorAll<HTMLElement>("[data-arrive] [data-live]"));
        if (reduced) {
          tl.set(pieces, { autoAlpha: 1 });
          if (categories) tl.set(categories, { autoAlpha: 1 });
          return tl;
        }
        if (categories) {
          tl.set(categories, { autoAlpha: 1 }, 0.15).fromTo(
            categories.children,
            { autoAlpha: 0, x: () => gsap.utils.random(-36, 36), y: 18 },
            {
              autoAlpha: 1, x: 0, y: 0, duration: 0.28, ease: "power3.out",
              stagger: { each: 0.045, from: "start" },
              clearProps: "transform,opacity,visibility",
            },
            0.15,
          );
        }
        if (rule) {
          tl.to(rule, { scaleX: 1, duration: 0.7, ease: "power3.inOut", clearProps: "transform" }, 0);
        }
        if (heading && title) {
          tl.add(charsRiseIn(heading), 0.1);
        }
        if (pieces.length > 0) {
          tl.fromTo(
            pieces,
            { autoAlpha: 0, y: 14 },
            { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out", stagger: 0.07, clearProps: "transform" },
            0.15,
          );
        }
        heroes.forEach((hero, i) => develop(hero, 0.2 + i * 0.1, tl));
        live.forEach((el, i) => resolve(el, 0.35 + i * 0.05, tl));
        return tl;
      };

      /* ------------------------------------------------- the rail */
      let active = -1;
      const driftTo = (index: number) => {
        if (index === active) {
          return;
        }
        active = index;
        const id = CHAPTERS[index]?.id;
        links.forEach((link) => {
          link.dataset.active = String(link.dataset.target === id);
        });
        const link = root.querySelector<HTMLElement>(`[data-rail] [data-rail-link][data-target="${id}"]`);
        if (!marker || !link) {
          return;
        }
        if (reduced) {
          gsap.set(marker, { y: link.offsetTop, autoAlpha: 1 });
          return;
        }
        gsap
          .timeline({ defaults: { overwrite: "auto" } })
          .to(marker, { autoAlpha: 1, duration: 0.15 }, 0)
          .to(marker, { y: link.offsetTop, duration: 0.65, ease: "power3.inOut" }, 0)
          .fromTo(
            marker,
            { scaleY: 1.35, transformOrigin: "50% 50%" },
            { scaleY: 1, duration: 0.5, ease: "power2.out" },
            0.2,
          );
      };

      /* ---------------------------------------------- the cards */
      const cardsIn = (cards: HTMLElement[]) => {
        if (reduced) {
          gsap.set(cards, { autoAlpha: 1 });
          return;
        }
        const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
        tl.fromTo(
          cards,
          { autoAlpha: 0, y: 24 },
          { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.out", stagger: 0.08, clearProps: "transform" },
          0,
        );
        cards.forEach((card, i) => {
          const photo = card.querySelector<HTMLElement>("[data-photo]");
          if (photo) {
            develop(photo, i * 0.08, tl);
          }
          card.querySelectorAll<HTMLElement>("[data-live]").forEach((el) => resolve(el, 0.2 + i * 0.08, tl));
        });
      };

      const reviewsIn = (rows: HTMLElement[]) => {
        if (reduced) {
          gsap.set(rows, { autoAlpha: 1 });
          return;
        }
        const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
        tl.fromTo(
          rows,
          { autoAlpha: 0, x: -12 },
          { autoAlpha: 1, x: 0, duration: 0.35, ease: "power2.out", stagger: 0.1, clearProps: "transform" },
          0,
        );
        rows.forEach((row, i) => drawStrokes(row, 0.1 + i * 0.1, tl));
      };

      /* ------------------------------------- scroll, armed at idle */
      const armScroll = () => {
        scrollRevealBatch("[data-reveal]:not([data-card]):not([data-review])", root);
        sections.forEach((section, index) => {
          if (index > 0) {
            ScrollTrigger.create({
              trigger: section,
              start: "top 85%",
              once: true,
              onEnter: () => {
                chapterIn(section);
                if (section.id === "item") {
                  itemArmed.current = true;
                  addButton.current?.enter(0.5);
                }
              },
            });
          }
          ScrollTrigger.create({
            trigger: section,
            start: "top 45%",
            end: "bottom 45%",
            onToggle: (self) => {
              if (self.isActive) {
                driftTo(index);
              }
            },
          });
        });
        ScrollTrigger.batch("[data-card]", {
          start: "top 88%",
          once: true,
          batchMax: 4,
          onEnter: (batch) => cardsIn(batch as HTMLElement[]),
        });
        ScrollTrigger.batch("[data-review]", {
          start: "top 90%",
          once: true,
          onEnter: (batch) => reviewsIn(batch as HTMLElement[]),
        });
      };

      /* ------------------------------------------------- arrival */
      let arrival: gsap.core.Timeline | null = null;
      // Watched from the root: the route split swaps the heading's own nodes.
      const unwatch = watchPageTransition(root, {
        onIdle: contextSafe(() => {
          idle.current = true;
          const browse = sections[0];
          if (browse) {
            // The title arrived with the route; the rest of the chapter follows it.
            arrival = chapterIn(browse, { title: false });
          }
          armScroll();
        }),
        onExiting: () => {
          idle.current = false;
          arrival?.kill();
          if (itemArmed.current) {
            addButton.current?.exit();
          }
          gsap.to(q("[data-arrive]"), { autoAlpha: 0, duration: 0.2, overwrite: "auto" });
        },
      });

      /* --------------------------------------------------- chips */
      for (const chip of q<HTMLElement>("[data-chip]")) {
        const label = chip.querySelector<HTMLElement>("[data-chip-label]") ?? chip;
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

      return () => {
        unwatch();
        cleanups.forEach((fn) => fn());
        arrival?.kill();
      };
    },
    { scope },
  );

  /* ------------------------------------- the page changed height */
  useGSAP(
    () => {
      // Refiling the grid, editing the cart, and placing the order all move
      // everything below them; the scroll triggers must learn the new places.
      ScrollTrigger.refresh();
    },
    { scope, dependencies: [category, cart, placed] },
  );

  /* -------------------------------------------- the item: an angle */
  useGSAP(
    () => {
      const root = scope.current;
      if (!root || previousAngle.current === angle) {
        return;
      }
      previousAngle.current = angle;
      const hero = root.querySelector<HTMLElement>("[data-item-hero]");
      if (hero && !prefersReducedMotion()) {
        develop(hero);
      }
    },
    { scope, dependencies: [angle] },
  );

  /* ------------------------------------------- the item: a size */
  useGSAP(
    () => {
      const root = scope.current;
      if (!root || previousOption.current === option) {
        return;
      }
      previousOption.current = option;
      const price = root.querySelector<HTMLElement>("[data-item-price]");
      if (price && !prefersReducedMotion()) {
        resolve(price);
        jump(price, 1.08);
      }
    },
    { scope, dependencies: [option] },
  );

  /* --------------------------------------------- the cart changed */
  useGSAP(
    () => {
      const root = scope.current;
      if (!root || previousCart.current === cart) {
        return;
      }
      previousCart.current = cart;
      if (prefersReducedMotion()) {
        return;
      }
      const chip = root.querySelector<HTMLElement>("[data-cart-chip]");
      const countEl = root.querySelector<HTMLElement>("[data-cart-count]");
      if (chip && countEl) {
        jump(chip, 1.2);
        resolve(countEl);
      }
      root
        .querySelectorAll<HTMLElement>("[data-cart] [data-live]")
        .forEach((el, i) => resolve(el, Math.min(i * 0.03, 0.2)));
      // A line that has just been added prints in on top.
      const added = root.querySelector<HTMLElement>("[data-line][data-fresh='true']");
      if (added) {
        gsap.fromTo(
          added,
          { autoAlpha: 0, x: -16 },
          { autoAlpha: 1, x: 0, duration: 0.4, ease: "power2.out", clearProps: "transform", overwrite: "auto" },
        );
      }
      setFresh(null);
    },
    { scope, dependencies: [cart] },
  );

  /* ---------------------------------------------- the order placed */
  useGSAP(
    () => {
      const root = scope.current;
      if (!root || previousPlaced.current === placed) {
        return;
      }
      previousPlaced.current = placed;
      // Starting again mounts the ledger afresh, and it is hidden before paint.
      gsap.set(root.querySelectorAll("[data-cart] [data-arrive]"), { autoAlpha: 1 });
      if (prefersReducedMotion()) {
        return;
      }
      const thanks = root.querySelector<HTMLElement>("[data-thanks]");
      if (placed && thanks) {
        const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
        tl.add(charsRiseIn(thanks), 0);
        tl.fromTo(
          root.querySelectorAll("[data-thanks-note]"),
          { autoAlpha: 0, y: 10 },
          { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out", stagger: 0.08, clearProps: "transform" },
          0.3,
        );
      }
      if (!placed) {
        const lines = root.querySelectorAll<HTMLElement>("[data-line]");
        gsap.fromTo(
          lines,
          { autoAlpha: 0, x: -16 },
          { autoAlpha: 1, x: 0, duration: 0.35, ease: "power2.out", stagger: 0.08, clearProps: "transform", overwrite: "auto" },
        );
      }
    },
    { scope, dependencies: [placed] },
  );

  /* ------------------------------------------------------ handlers */

  /** Refiles the grid: cards slide to their new places, the rest shrink away. */
  const filter = (next: Category) => {
    const root = scope.current;
    if (next === category) {
      return;
    }
    const cards = root ? Array.from(root.querySelectorAll<HTMLElement>("[data-grid] [data-card]")) : [];
    if (!root || cards.length === 0 || prefersReducedMotion() || !idle.current) {
      setCategory(next);
      return;
    }
    const state = Flip.getState(cards);
    flushSync(() => setCategory(next));
    Flip.from(state, {
      targets: cards,
      duration: 0.5,
      ease: "power2.inOut",
      absoluteOnLeave: true,
      scale: true,
      onEnter: (elements) =>
        gsap.fromTo(
          elements,
          { autoAlpha: 0, scale: 0.9 },
          { autoAlpha: 1, scale: 1, duration: 0.4, ease: "power2.out", overwrite: "auto" },
        ),
      onLeave: (elements) =>
        gsap.to(elements, { autoAlpha: 0, scale: 0.9, duration: 0.3, ease: "power2.in", overwrite: "auto" }),
    });
  };

  const toggleFavorite = (id: string, button: HTMLButtonElement) => {
    const on = !favorites.has(id);
    setFavorites((previous) => {
      const next = new Set(previous);
      if (on) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
    if (on && !prefersReducedMotion()) {
      const heart = button.querySelector("svg") ?? button;
      jump(heart, 1.5);
    }
  };

  /** Puts the item in the cart. Its photograph flies up into the chrome first. */
  const addToCart = () => {
    const root = scope.current;
    const add = () => {
      const listing: Listing = { ...ITEM, price: choice.price };
      const next: CartLine = { listing, quantity: 1, option: choice.label };
      setCart((previous) => {
        const existing = previous.find((line) => lineKey(line) === lineKey(next));
        if (existing) {
          return previous.map((line) => (line === existing ? { ...line, quantity: line.quantity + 1 } : line));
        }
        return [next, ...previous];
      });
      setFresh((current) => (cartRef.current.some((line) => lineKey(line) === lineKey(next)) ? current : lineKey(next)));
      setPlaced(null);
    };
    const img = root?.querySelector<HTMLImageElement>("[data-item-hero] img");
    const chip = root?.querySelector<HTMLElement>("[data-cart-chip]");
    if (!root || !img || !chip || prefersReducedMotion()) {
      add();
      return;
    }
    addButton.current?.blast();
    gsap.delayedCall(0.6, () => addButton.current?.idle());

    const from = img.getBoundingClientRect();
    const to = chip.getBoundingClientRect();
    const clone = img.cloneNode() as HTMLImageElement;
    clone.removeAttribute("class");
    clone.setAttribute("aria-hidden", "true");
    Object.assign(clone.style, {
      position: "fixed",
      left: `${from.left}px`,
      top: `${from.top}px`,
      width: `${from.width}px`,
      height: `${from.height}px`,
      objectFit: "cover",
      filter: "grayscale(1) contrast(1.25)",
      borderRadius: "4px",
      zIndex: "60",
      pointerEvents: "none",
      margin: "0",
    });
    document.body.appendChild(clone);
    gsap.to(clone, {
      left: to.left + to.width / 2 - 14,
      top: to.top + to.height / 2 - 14,
      width: 28,
      height: 28,
      autoAlpha: 0.35,
      duration: 0.75,
      ease: "power3.inOut",
      overwrite: "auto",
      onComplete: () => {
        clone.remove();
        add();
      },
    });
  };

  const setQuantity = (line: CartLine, quantity: number) => {
    const key = lineKey(line);
    setCart((previous) =>
      previous.map((entry) => (lineKey(entry) === key ? { ...entry, quantity: Math.max(1, quantity) } : entry)),
    );
  };

  /** Takes a line out of the cart. It folds shut before it goes. */
  const removeLine = (line: CartLine, row: HTMLElement | null) => {
    const key = lineKey(line);
    const drop = () => setCart((previous) => previous.filter((entry) => lineKey(entry) !== key));
    if (!row || prefersReducedMotion()) {
      drop();
      return;
    }
    gsap.to(row, {
      height: 0,
      paddingTop: 0,
      paddingBottom: 0,
      autoAlpha: 0,
      duration: 0.35,
      ease: "power2.in",
      overwrite: "auto",
      onComplete: drop,
    });
  };

  /** Places the order: the lines leave upward and the thanks come in. */
  const checkout = () => {
    const root = scope.current;
    const number = `MD-${orderNumber++}`;
    const place = () => {
      setPlaced(number);
      setCart([]);
    };
    const lines = root ? Array.from(root.querySelectorAll<HTMLElement>("[data-line]")) : [];
    if (lines.length === 0 || prefersReducedMotion()) {
      place();
      return;
    }
    gsap.to(lines, {
      autoAlpha: 0,
      y: -24,
      duration: 0.3,
      ease: "power2.in",
      stagger: 0.06,
      overwrite: "auto",
      onComplete: place,
    });
  };

  const startAgain = () => {
    setPlaced(null);
    setCart(CART_START);
  };

  const currentAngle = ANGLES[angle] ?? ANGLES[0]!;
  const shopListings = SHOP.listings.map((entry) => ({
    ...entry,
    photo: "photo" in entry ? entry.photo : ITEM.photo,
  }));

  return (
    <div ref={scope} className="@container">
      {/* Persistent chrome */}
      <header
        data-page-transition
        className="sticky top-0 z-30 -mx-gutter border-b border-border bg-canvas px-gutter sm:-mx-gutter-lg sm:px-gutter-lg"
      >
        <div className="flex min-h-14 flex-wrap items-center gap-x-5 gap-y-2 py-2">
          <a href="#top" className="font-mono text-base font-extrabold uppercase tracking-[0.24em] text-foreground">
            Made
          </a>
          <span aria-hidden="true" className="hidden h-6 w-px bg-border sm:block" />
          <form role="search" className="hidden min-w-0 flex-1 md:block" onSubmit={(event) => event.preventDefault()}>
            <label className="sr-only" htmlFor="made-search">
              Search for anything
            </label>
            <input
              id="made-search"
              type="search"
              placeholder="SEARCH FOR ANYTHING"
              className={`${MONO_LABEL} h-9 w-full max-w-md rounded-lg border-2 border-foreground bg-transparent px-3.5 text-foreground placeholder:text-muted focus-visible:outline-offset-0`}
            />
          </form>
          <nav aria-label="Account" className="ml-auto flex items-center gap-x-4 sm:gap-x-6">
            {["Sell", "Sign in"].map((link) => (
              <a key={link} href="#top" className={`${MONO_LABEL} hidden text-foreground transition-colors hover:text-muted sm:block`}>
                {link}
              </a>
            ))}
            <a href="#cart" data-cart-chip data-chip className={CHIP_OUTLINE}>
              <span data-chip-label>Cart</span>
              <span
                data-cart-count
                data-live
                className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-inverse px-1 text-inverse-foreground tabular-nums"
              >
                {count}
              </span>
            </a>
          </nav>
        </div>
        <nav aria-label="Chapters" className="-mx-gutter overflow-x-auto px-gutter pb-3 lg:hidden">
          <ul className="flex gap-2">
            {CHAPTERS.map((chapter) => (
              <li key={chapter.id}>
                <a data-rail-link data-target={chapter.id} href={`#${chapter.id}`} className={CHIP_RAIL}>
                  <span>{chapter.number}</span>
                  <span>{chapter.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <div className="mt-6 grid grid-cols-12 gap-x-6">
        {/* The rail */}
        <nav
          data-page-transition
          aria-label="Chapters"
          className="sticky top-24 hidden self-start lg:col-span-2 lg:block"
        >
          <ol data-rail className="relative">
            <span
              data-rail-marker
              aria-hidden="true"
              className="absolute top-0 left-0 h-9 w-full rounded-md bg-inverse"
            />
            {CHAPTERS.map((chapter) => (
              <li key={chapter.id}>
                <a
                  data-rail-link
                  data-chip
                  data-target={chapter.id}
                  href={`#${chapter.id}`}
                  className="relative z-10 flex h-9 items-center gap-4 rounded-md px-3 font-mono text-caption font-bold uppercase tracking-[0.08em] text-muted transition-colors hover:text-foreground data-[active=true]:text-inverse-foreground"
                >
                  <span>{chapter.number}</span>
                  <span data-chip-label>{chapter.title}</span>
                </a>
              </li>
            ))}
          </ol>
          <p className={`${MONO_NOTE} mt-8 text-muted`}>{TODAY}</p>
        </nav>

        <div className="col-span-12 lg:col-span-10">
          {/* 01 Browse */}
          <section id="browse" data-chapter className="scroll-mt-24">
            <ChapterHead chapter={CHAPTERS[0]} eager />
            <div className="mt-8 grid grid-cols-12 gap-x-6 gap-y-10">
              <div className="col-span-12 lg:col-span-7">
                <ul data-arrive data-browse-categories className="flex flex-wrap gap-2" aria-label="Categories">
                  {CATEGORIES.map((entry) => (
                    <li key={entry}>
                      <button
                        type="button"
                        data-chip
                        aria-pressed={entry === category}
                        className={CHIP_TOGGLE}
                        onClick={() => filter(entry)}
                      >
                        <span data-chip-label>{entry}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <p data-arrive className={`${MONO_NOTE} mt-5 text-muted`}>
                  <span data-live className="text-foreground">
                    {GRID.filter((listing) => category === "All" || listing.category === category).length}
                  </span>{" "}
                  results <span aria-hidden="true">·</span> Sorted by relevance{" "}
                  <span aria-hidden="true">·</span> Ships to 94110
                </p>
                <ul data-grid className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10" aria-label="Listings">
                  {GRID.map((listing) => {
                    const shown = category === "All" || listing.category === category;
                    return (
                      <li
                        key={listing.id}
                        data-reveal
                        data-card
                        className={shown ? undefined : "hidden"}
                      >
                        <ListingCard
                          listing={listing}
                          favorite={favorites.has(listing.id)}
                          onFavorite={toggleFavorite}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* The featured listing: the photograph, cropped hard at the gutter */}
              <figure data-arrive className="col-span-12 lg:col-span-5">
                <figcaption className={`${MONO_NOTE} flex h-9 items-center gap-3`}>
                  <span className="font-bold text-foreground">Featured</span>
                  <span className="text-muted">
                    {FEATURED.shop} <span aria-hidden="true">·</span> {FEATURED.badge}
                  </span>
                </figcaption>
                <div className="-mr-gutter sm:-mr-gutter-lg">
                  <div
                    data-photo="hero"
                    className="relative aspect-[4/5] overflow-hidden lg:aspect-auto lg:h-[38rem]"
                  >
                    {/* Wikimedia Commons serves these; next/image would need the host allow-listed for no gain here. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={FEATURED.photo.src}
                      alt={FEATURED.photo.alt}
                      loading="eager"
                      referrerPolicy="no-referrer"
                      className={`${PHOTO} object-[50%_45%]`}
                    />
                  </div>
                </div>
                <div className="mt-5 flex items-start justify-between gap-6">
                  <div className="min-w-0">
                    <h3 className={`${TITLE} text-[1.375rem]`}>
                      <a href="#item" className="transition-colors hover:text-muted">
                        {FEATURED.title}
                      </a>
                    </h3>
                    <p className={`${MONO_NOTE} mt-2 text-muted`}>
                      <Stars count={5} className="mr-2 inline-flex align-[-2px]" />
                      {FEATURED.rating} <span aria-hidden="true">·</span> {FEATURED.reviews} reviews
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <p data-live className={`${PRICE} text-3xl`}>
                      {dollars(FEATURED.price)}
                    </p>
                    <HeartButton
                      on={favorites.has(FEATURED.id)}
                      title={FEATURED.title}
                      onToggle={(button) => toggleFavorite(FEATURED.id, button)}
                    />
                  </div>
                </div>
                <Credit photo={FEATURED.photo} className="mt-3" />
              </figure>
            </div>
          </section>

          {/* 02 Item */}
          <section id="item" data-chapter className="mt-section scroll-mt-24">
            <ChapterHead chapter={CHAPTERS[1]} />
            <div className="mt-8 grid grid-cols-12 gap-x-6 gap-y-10">
              <figure data-arrive className="col-span-12 lg:col-span-7">
                <div
                  data-item-hero
                  data-photo="hero"
                  className="relative aspect-[4/5] overflow-hidden sm:aspect-square lg:aspect-[4/5]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={currentAngle.src}
                    src={currentAngle.src}
                    alt={currentAngle.alt}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className={PHOTO}
                  />
                </div>
                <ul className="mt-4 flex gap-3" aria-label="Photographs">
                  {ANGLES.map((photo, index) => (
                    <li key={photo.src}>
                      <button
                        type="button"
                        aria-pressed={index === angle}
                        aria-label={`Photograph ${index + 1}`}
                        onClick={() => setAngle(index)}
                        className="relative block size-16 cursor-pointer overflow-hidden rounded-sm border-2 border-border transition-colors hover:border-foreground aria-pressed:border-foreground sm:size-20"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.src} alt="" loading="lazy" referrerPolicy="no-referrer" className={PHOTO} />
                      </button>
                    </li>
                  ))}
                </ul>
                <Credit photo={currentAngle} className="mt-3" />
              </figure>

              <div data-arrive className="col-span-12 lg:col-span-5">
                <p className={`${MONO_NOTE} text-muted`}>
                  <a href="#shop" className="font-bold text-foreground underline decoration-1 underline-offset-4">
                    {ITEM.shop}
                  </a>{" "}
                  <span aria-hidden="true">·</span> <Stars count={5} className="inline-flex align-[-2px]" />{" "}
                  {SHOP.rating} <span aria-hidden="true">·</span> {SHOP.reviewCount} reviews
                </p>
                <h3 className={`${TITLE} mt-4 text-[clamp(1.75rem,4.2cqi,3rem)]`}>{ITEM.title}</h3>
                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <p data-item-price data-live className={`${PRICE} text-5xl sm:text-6xl`}>
                    {dollars(choice.price)}
                  </p>
                  {ITEM.badge ? <span className={CHIP_SMALL}>{ITEM.badge}</span> : null}
                </div>
                <p className="mt-5 max-w-[46ch] font-sans text-[15px] leading-[22px] text-muted text-pretty">
                  {ITEM_DETAIL.lead}
                </p>

                <fieldset className="mt-8">
                  <legend className={`${MONO_LABEL} text-muted`}>
                    {ITEM_DETAIL.options.label} <span aria-hidden="true">·</span>{" "}
                    <span className="text-foreground">{choice.label}</span>
                  </legend>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {ITEM_DETAIL.options.choices.map((entry, index) => (
                      <li key={entry.id}>
                        <button
                          type="button"
                          data-chip
                          aria-pressed={index === option}
                          className={CHIP_TOGGLE}
                          onClick={() => setOption(index)}
                        >
                          <span data-chip-label>{entry.label.split(" · ")[0]}</span>
                          <span className="font-normal opacity-70">{entry.label.split(" · ")[1]}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </fieldset>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <ParticleButton ref={addButton} effect={reactor} className={BUTTON_PRIMARY} onClick={addToCart}>
                    Add to cart
                  </ParticleButton>
                  <button
                    type="button"
                    className={`${BUTTON_SECONDARY} gap-3`}
                    aria-pressed={favorites.has(ITEM.id)}
                    onClick={(event) => toggleFavorite(ITEM.id, event.currentTarget)}
                  >
                    <Heart on={favorites.has(ITEM.id)} className="size-6" />
                    {favorites.has(ITEM.id) ? "Saved" : "Save"}
                  </button>
                </div>

                <dl className="mt-10 border-t border-border">
                  {ITEM_DETAIL.facts.map((fact) => (
                    <div key={fact.label} className="grid grid-cols-[7rem_1fr] gap-x-4 border-b border-border py-3">
                      <dt className={`${MONO_NOTE} pt-0.5 text-muted`}>{fact.label}</dt>
                      <dd className="font-sans text-[15px] leading-[22px] font-medium">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </section>

          {/* 03 Shop */}
          <section id="shop" data-chapter className="mt-section scroll-mt-24">
            <ChapterHead chapter={CHAPTERS[2]} />
            <div className="mt-8 grid grid-cols-12 gap-x-6 gap-y-10">
              <div className="col-span-12 lg:col-span-7">
                <div data-arrive>
                  <p className={`${MONO_LABEL} text-muted`}>
                    {SHOP.owner} <span aria-hidden="true">·</span> {SHOP.location}{" "}
                    <span aria-hidden="true">·</span> Since {SHOP.since}
                  </p>
                  <h3 className={`${DISPLAY} mt-3 -ml-[0.04em] text-[clamp(2.75rem,8cqi,6.5rem)] text-balance`}>
                    {SHOP.name}
                  </h3>
                </div>
                <dl data-arrive className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-border pt-5 sm:grid-cols-4">
                  {[
                    { label: "Sales", value: SHOP.sales },
                    { label: "Rating", value: SHOP.rating },
                    { label: "Reviews", value: SHOP.reviewCount },
                    { label: "Admirers", value: SHOP.admirers },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <dt className={`${MONO_NOTE} text-muted`}>{stat.label}</dt>
                      <dd data-live className={`${PRICE} mt-1 text-4xl sm:text-5xl`}>
                        {stat.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p data-arrive className="mt-8 max-w-[52ch] font-sans text-[15px] leading-[22px] text-muted text-pretty">
                  {SHOP.lead}
                </p>
                <ul data-arrive className="mt-6 flex flex-wrap gap-x-8 gap-y-2" aria-label="Policies">
                  {SHOP.policies.map((policy) => (
                    <li key={policy.label} className={`${MONO_NOTE} text-muted`}>
                      {policy.label} <span aria-hidden="true">·</span>{" "}
                      <span className="font-bold text-foreground">{policy.value}</span>
                    </li>
                  ))}
                </ul>
                <div data-arrive className="mt-8 flex flex-wrap gap-2">
                  <button type="button" data-chip className={CHIP_TOGGLE} aria-pressed="true">
                    <span data-chip-label>Following</span>
                  </button>
                  <button type="button" data-chip className={CHIP_OUTLINE}>
                    <span data-chip-label>Message</span>
                  </button>
                </div>
              </div>

              <figure data-arrive className="col-span-12 lg:col-span-5">
                <figcaption className={`${MONO_NOTE} flex h-9 items-center gap-3`}>
                  <span className="font-bold text-foreground">The workshop</span>
                  <span className="text-muted">{SHOP.location}</span>
                </figcaption>
                <div className="-mr-gutter sm:-mr-gutter-lg">
                  <div data-photo="hero" className="relative aspect-[4/5] overflow-hidden lg:aspect-auto lg:h-[34rem]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={SHOP.photo.src}
                      alt={SHOP.photo.alt}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className={PHOTO}
                      style={{ objectPosition: SHOP.photo.position }}
                    />
                  </div>
                </div>
                <Credit photo={SHOP.photo} className="mt-3 pr-gutter sm:pr-gutter-lg" />
              </figure>
            </div>

            {/* The shop's listings */}
            <div data-reveal className="mt-12 flex items-baseline justify-between gap-6 border-t border-border pt-4">
              <h4 className={`${MONO_LABEL} text-foreground`}>Listings</h4>
              <p className={`${MONO_NOTE} text-muted`}>
                {SHOP.listings.length} of 46 <span aria-hidden="true">·</span> Sorted by bestselling
              </p>
            </div>
            <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4" aria-label="Shop listings">
              {shopListings.map((entry) => (
                <li key={entry.id} data-reveal data-card>
                  <ListingCard
                    listing={{
                      id: entry.id,
                      title: entry.title,
                      shop: SHOP.name,
                      price: entry.price,
                      category: "Home",
                      rating: 5,
                      reviews: 0,
                      photo: entry.photo,
                    }}
                    favorite={favorites.has(entry.id)}
                    onFavorite={toggleFavorite}
                    compact
                  />
                </li>
              ))}
            </ul>

            {/* The reviews */}
            <div data-reveal className="mt-12 flex items-baseline justify-between gap-6 border-t border-border pt-4">
              <h4 className={`${MONO_LABEL} text-foreground`}>Reviews</h4>
              <p className={`${MONO_NOTE} text-muted`}>
                {SHOP.reviews.length} of {SHOP.reviewCount} <span aria-hidden="true">·</span> Most recent
              </p>
            </div>
            <ol className="mt-2" aria-label="Reviews">
              {SHOP.reviews.map((review) => (
                <li
                  key={`${review.user}-${review.date}`}
                  data-reveal
                  data-review
                  className="grid grid-cols-[2.5rem_1fr] gap-x-4 border-b border-border py-5 lg:grid-cols-[2.5rem_11rem_1fr]"
                >
                  <span
                    aria-label={`Review by ${review.name}`}
                    className="inline-flex h-[22px] w-8 items-center justify-center rounded-sm border border-foreground font-mono text-[10px] font-bold uppercase tracking-[0.04em]"
                  >
                    {review.user}
                  </span>
                  <div className="min-w-0">
                    <p className={`${MONO_NOTE} text-muted`}>
                      <span className="font-bold text-foreground">{review.name}</span>{" "}
                      <span aria-hidden="true">·</span> {review.date}
                    </p>
                    <Stars count={review.stars} className="mt-2 flex" label={`${review.stars} of 5 stars`} />
                  </div>
                  <div className="col-span-2 mt-3 min-w-0 lg:col-span-1 lg:mt-0">
                    <p className="max-w-[60ch] font-sans text-[15px] leading-[22px] font-medium text-pretty">
                      {review.text}
                    </p>
                    <p className={`${MONO_NOTE} mt-2 text-muted`}>{review.item}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* 04 Cart */}
          <section id="cart" data-chapter data-cart className="mt-section scroll-mt-24">
            <ChapterHead chapter={CHAPTERS[3]} />
            <div className="mt-8 grid grid-cols-12 gap-x-6 gap-y-10">
              <div className="col-span-12 lg:col-span-7">
                {placed ? (
                  <div>
                    <h3 data-thanks className={`${DISPLAY} -ml-[0.04em] text-[clamp(2.75rem,9cqi,7.5rem)]`}>
                      Thank you
                    </h3>
                    <p data-thanks-note className={`${MONO_LABEL} mt-6 text-muted`}>
                      Order <span className="text-foreground">{placed}</span> <span aria-hidden="true">·</span>{" "}
                      Ships Mon 08 Sep <span aria-hidden="true">·</span> Receipt sent
                    </p>
                    <p data-thanks-note className="mt-4 max-w-[46ch] font-sans text-[15px] leading-[22px] text-muted text-pretty">
                      Each maker has been told. You will hear from them when it is packed.
                    </p>
                    <div data-thanks-note className="mt-8">
                      <button type="button" className={BUTTON_SECONDARY} onClick={startAgain}>
                        Start again
                      </button>
                    </div>
                  </div>
                ) : cart.length === 0 ? (
                  <div>
                    <p className={`${TITLE} text-[1.375rem]`}>Your cart is empty.</p>
                    <div className="mt-6">
                      <button type="button" className={BUTTON_SECONDARY} onClick={startAgain}>
                        Start again
                      </button>
                    </div>
                  </div>
                ) : (
                  <ol data-arrive className="border-t border-border" aria-label="Cart lines">
                    {cart.map((line) => (
                      <CartRow
                        key={lineKey(line)}
                        line={line}
                        fresh={fresh === lineKey(line)}
                        onQuantity={(quantity) => setQuantity(line, quantity)}
                        onRemove={(row) => removeLine(line, row)}
                      />
                    ))}
                  </ol>
                )}
              </div>

              <div data-arrive className="col-span-12 lg:col-span-5">
                <div className="rounded-lg border-2 border-border bg-surface p-6 sm:p-8">
                  <h3 className={`${MONO_LABEL} text-foreground`}>Summary</h3>
                  <dl className="mt-5">
                    {[
                      { label: `Subtotal · ${count} ${count === 1 ? "item" : "items"}`, value: subtotal },
                      { label: "Shipping", value: shipping },
                      { label: "Tax · 94110", value: tax },
                    ].map((row) => (
                      <div key={row.label} className="flex items-baseline justify-between gap-6 border-b border-border py-3">
                        <dt className={`${MONO_NOTE} text-muted`}>{row.label}</dt>
                        <dd data-live className={`${PRICE} text-lg`}>
                          {dollars(row.value)}
                        </dd>
                      </div>
                    ))}
                    <div className="flex items-baseline justify-between gap-6 py-4">
                      <dt className={`${MONO_LABEL} text-foreground`}>Total</dt>
                      <dd data-live className={`${PRICE} text-4xl sm:text-5xl`}>
                        {dollars(total)}
                      </dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    className={`${BUTTON_PRIMARY} mt-2 w-full`}
                    disabled={cart.length === 0 || placed !== null}
                    onClick={checkout}
                  >
                    {placed ? "Order placed" : "Check out"}
                  </button>
                  <p className={`${MONO_NOTE} mt-4 text-muted`}>
                    Secure checkout <span aria-hidden="true">·</span> {cart.length}{" "}
                    {cart.length === 1 ? "shop" : "shops"} <span aria-hidden="true">·</span> Tax estimated
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div data-reveal className="mt-section flex flex-wrap gap-4 border-t border-border pt-10">
            <a className={BUTTON_PRIMARY} href="#top">
              Back to top
            </a>
            <a className={BUTTON_SECONDARY} href="/showcase">
              All demos
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- pieces */

function ChapterHead({
  chapter,
  eager = false,
}: {
  chapter: (typeof CHAPTERS)[number];
  eager?: boolean;
}) {
  const numbers = (
    <p className="font-mono text-caption uppercase tracking-[0.08em] text-muted">
      {chapter.number} <span aria-hidden="true">/</span> {String(CHAPTERS.length).padStart(2, "0")}
    </p>
  );
  const title = `${DISPLAY} mt-3 -ml-[0.04em] text-[clamp(3.25rem,10cqi,8.5rem)]`;
  if (eager) {
    return (
      <div>
        <div data-page-transition>{numbers}</div>
        <h2 data-title data-page-transition="letters" className={title}>
          {chapter.title}
        </h2>
        <div data-page-transition>
          <span data-rule aria-hidden="true" className="mt-4 block h-px w-full bg-foreground" />
        </div>
      </div>
    );
  }
  return (
    <div data-reveal>
      {numbers}
      <h2 data-title className={title}>
        {chapter.title}
      </h2>
      <span data-rule aria-hidden="true" className="mt-4 block h-px w-full bg-foreground" />
    </div>
  );
}

function ListingCard({
  listing,
  favorite,
  onFavorite,
  compact = false,
}: {
  listing: Listing;
  favorite: boolean;
  onFavorite: (id: string, button: HTMLButtonElement) => void;
  compact?: boolean;
}) {
  return (
    <article className="group">
      <div className="relative">
        <a href="#item" className="block" aria-label={listing.title}>
          <div data-photo="card" className="relative aspect-[4/5] overflow-hidden rounded-sm bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={listing.photo.src}
              alt={listing.photo.alt}
              loading="lazy"
              referrerPolicy="no-referrer"
              className={`${PHOTO} transition-transform duration-500 ease-out group-hover:scale-[1.03]`}
            />
          </div>
        </a>
        <HeartButton
          on={favorite}
          title={listing.title}
          onToggle={(button) => onFavorite(listing.id, button)}
          className="absolute top-2 right-2"
        />
        {listing.badge ? (
          <span className={`${CHIP_SMALL} absolute bottom-2 left-2 bg-canvas`}>{listing.badge}</span>
        ) : null}
      </div>
      <p className={`${MONO_NOTE} mt-3 text-muted`}>{listing.shop}</p>
      <h3 className={`${TITLE} mt-1 line-clamp-2 text-[15px] leading-[20px]`}>
        <a href="#item" className="transition-colors hover:text-muted">
          {listing.title}
        </a>
      </h3>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p data-live className={`${PRICE} text-xl`}>
          {dollars(listing.price)}
        </p>
        {compact || listing.reviews === 0 ? null : (
          <p className={`${MONO_NOTE} text-muted`}>
            <Star filled className="mr-1 inline-block size-3 align-[-1px]" /> {listing.rating}{" "}
            <span aria-hidden="true">·</span> {listing.reviews.toLocaleString("en-US")}
          </p>
        )}
      </div>
    </article>
  );
}

function CartRow({
  line,
  fresh,
  onQuantity,
  onRemove,
}: {
  line: CartLine;
  fresh: boolean;
  onQuantity: (quantity: number) => void;
  onRemove: (row: HTMLElement | null) => void;
}) {
  const row = useRef<HTMLLIElement>(null);
  return (
    <li
      ref={row}
      data-line
      data-fresh={fresh ? "true" : undefined}
      className="grid grid-cols-[4.5rem_1fr] gap-x-4 gap-y-3 overflow-hidden border-b border-border py-5 sm:grid-cols-[5.5rem_1fr_auto]"
    >
      <div className="relative aspect-square overflow-hidden rounded-sm bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={line.listing.photo.src} alt="" loading="lazy" referrerPolicy="no-referrer" className={PHOTO} />
      </div>
      <div className="min-w-0">
        <p className={`${MONO_NOTE} text-muted`}>{line.listing.shop}</p>
        <h3 className={`${TITLE} mt-1 text-[17px] leading-[22px]`}>{line.listing.title}</h3>
        {line.option ? <p className={`${MONO_NOTE} mt-1 text-muted`}>{line.option}</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-1" role="group" aria-label="Quantity">
            <button
              type="button"
              className={STEP}
              aria-label="One fewer"
              disabled={line.quantity <= 1}
              onClick={() => onQuantity(line.quantity - 1)}
            >
              −
            </button>
            <span className={`${PRICE} inline-flex w-8 justify-center text-base`}>{line.quantity}</span>
            <button type="button" className={STEP} aria-label="One more" onClick={() => onQuantity(line.quantity + 1)}>
              +
            </button>
          </div>
          <button
            type="button"
            className={`${MONO_NOTE} cursor-pointer text-muted underline decoration-1 underline-offset-4 transition-colors hover:text-foreground`}
            onClick={() => onRemove(row.current)}
          >
            Remove
          </button>
        </div>
      </div>
      <p data-live className={`${PRICE} col-start-2 text-xl sm:col-start-3 sm:text-2xl`}>
        {dollars(line.listing.price * line.quantity)}
      </p>
    </li>
  );
}

function HeartButton({
  on,
  title,
  onToggle,
  className,
}: {
  on: boolean;
  title: string;
  onToggle: (button: HTMLButtonElement) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`${on ? "Remove" : "Save"} ${title}`}
      onClick={(event) => onToggle(event.currentTarget)}
      className={[
        "inline-flex size-9 cursor-pointer items-center justify-center rounded-md border-2 border-foreground bg-canvas text-foreground transition-colors hover:bg-surface-hover",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Heart on={on} className="size-4" />
    </button>
  );
}

function Heart({ on, className }: { on: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M12 20.5 4.6 13.3a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9a4.6 4.6 0 0 1 6.5 6.5Z"
        fill={on ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Five stars, the first `count` of them filled. Each is tagged so the page can draw it. */
function Stars({ count, className, label }: { count: number; className?: string; label?: string }) {
  return (
    <span className={["gap-0.5", className].filter(Boolean).join(" ")} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} filled={i < count} className="size-3.5" />
      ))}
    </span>
  );
}

function Star({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path
        data-stroke
        data-filled={filled ? "" : undefined}
        d="M10 1.8l2.5 5.3 5.8.7-4.3 4 1.1 5.7L10 14.7l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Credit({ photo, className }: { photo: Photo; className?: string }) {
  return (
    <p className={[`${MONO_NOTE} text-muted`, className].filter(Boolean).join(" ")}>
      Photograph{" "}
      <a
        href={photo.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="underline decoration-1 underline-offset-4 transition-colors hover:text-foreground"
      >
        {photo.credit}
      </a>{" "}
      <span aria-hidden="true">·</span>{" "}
      {photo.licenseUrl ? (
        <a
          href={photo.licenseUrl}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-1 underline-offset-4 transition-colors hover:text-foreground"
        >
          {photo.license}
        </a>
      ) : (
        photo.license
      )}
    </p>
  );
}
