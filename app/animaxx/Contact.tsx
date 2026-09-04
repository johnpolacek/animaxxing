"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import {
  charsCascadeIn,
  charsScatterIn,
  gsap,
  prefersReducedMotion,
  useGSAP,
} from "@/components/motion";
import { reactor } from "@/lib/animation/effects/particleButtons";
import { watchPageTransition } from "@/lib/animation/pageState";
import { ParticleButton, type ParticleButtonHandle } from "../ParticleButton";
import { FormField, type FormFieldHandle } from "./FormField";

/*
 * The call to action and the form it opens.
 *
 * The button is a reactor: it assembles out of sparks with the route
 * entrance and breathes embers until pressed. Pressing it blasts the button
 * and opens the form over the page, which falls back out of focus behind
 * it. The form's heading scatters in, its fields draw themselves as rules
 * of light one after another, and the send button assembles last.
 *
 * Sending is a mock: the form throws everything it has at the screen and
 * thanks you. Nothing leaves the browser.
 */

/** Seconds after the route entrance starts before the button assembles. */
const BUTTON_DELAY = 1.1;
/** Seconds the form holds after a send before it thanks you. */
const SEND_HOLD = 0.9;

const BUTTON =
  "inline-flex cursor-pointer items-center rounded-xl bg-inverse px-8 py-5 font-sans text-5xl font-extrabold uppercase tracking-[-0.03em] text-inverse-foreground transition-colors hover:bg-inverse-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus sm:px-12 sm:py-7 sm:text-7xl";
const SEND =
  "inline-flex cursor-pointer items-center rounded-lg bg-inverse px-6 py-3 font-sans text-3xl font-extrabold uppercase tracking-[-0.02em] text-inverse-foreground transition-colors hover:bg-inverse-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus sm:text-4xl";
const CLOSE =
  "inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border-2 border-border font-sans text-2xl font-extrabold text-foreground transition-colors hover:border-foreground hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus";
const HEADING = "font-sans text-statement font-extrabold uppercase";

export function Contact() {
  const scope = useRef<HTMLDivElement>(null);
  const button = useRef<ParticleButtonHandle>(null);
  const [open, setOpen] = useState(false);

  useGSAP(
    () => {
      const root = scope.current;
      if (!root) {
        return;
      }
      if (prefersReducedMotion()) {
        gsap.set(root, { autoAlpha: 1 });
        return;
      }
      let entered = false;
      const enter = (delay: number) => {
        entered = true;
        button.current?.enter(delay);
        gsap.set(root, { autoAlpha: 1 });
      };
      return watchPageTransition(root, {
        onEntering: () => enter(BUTTON_DELAY),
        onIdle: () => {
          if (!entered) {
            enter(0);
          }
        },
        onExiting: () => {
          entered = false;
          button.current?.exit();
        },
      });
    },
    { scope },
  );

  const press = () => {
    button.current?.blast();
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    button.current?.idle();
    button.current?.element?.focus({ preventScroll: true });
  };

  return (
    <div ref={scope} data-hero-actions className="mt-12 [container-type:inline-size]">
      <ParticleButton ref={button} effect={reactor} className={BUTTON} onClick={press}>
        Contact us
      </ParticleButton>
      {open && <ContactForm onClose={close} />}
    </div>
  );
}

function ContactForm({ onClose }: { onClose: () => void }) {
  const overlay = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const name = useRef<FormFieldHandle>(null);
  const email = useRef<FormFieldHandle>(null);
  const site = useRef<FormFieldHandle>(null);
  const message = useRef<FormFieldHandle>(null);
  const send = useRef<ParticleButtonHandle>(null);
  const thanks = useRef<HTMLDivElement>(null);
  const leave = useRef<() => void>(onClose);
  const [sent, setSent] = useState(false);
  const fields = () => [name.current, email.current, site.current, message.current];

  // The page behind the form drops out of focus while it is open.
  useEffect(() => {
    const page = document.querySelector<HTMLElement>("[data-transition-state]");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (page && !prefersReducedMotion()) {
      gsap.to(page, { scale: 0.97, filter: "blur(10px)", duration: 0.6, ease: "power3.out", overwrite: "auto" });
    }
    return () => {
      document.body.style.overflow = previousOverflow;
      if (page) {
        gsap.to(page, {
          scale: 1,
          filter: "blur(0px)",
          duration: 0.4,
          ease: "power2.out",
          overwrite: "auto",
          clearProps: "transform,filter",
        });
      }
    };
  }, []);

  useGSAP(
    (_context, contextSafe) => {
      const backdrop = overlay.current;
      const card = panel.current;
      const title = heading.current;
      if (!backdrop || !card || !title || !contextSafe) {
        return;
      }

      if (prefersReducedMotion()) {
        gsap.set([backdrop, card, title], { autoAlpha: 1 });
        for (const field of fields()) {
          field?.enter(0);
        }
        send.current?.enter(0);
        name.current?.element?.focus();
        leave.current = onClose;
        return;
      }

      const intro = gsap.timeline({ defaults: { overwrite: "auto" } });
      intro
        .fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: "power2.out" }, 0)
        .fromTo(
          card,
          { autoAlpha: 0, scale: 0.86, rotation: -4, y: 40, transformOrigin: "50% 60%" },
          { autoAlpha: 1, scale: 1, rotation: 0, y: 0, duration: 0.6, ease: "back.out(1.6)" },
          0.05,
        )
        .add(charsScatterIn(title), 0.2)
        .fromTo(closeButton.current, { autoAlpha: 0, rotation: -90 }, { autoAlpha: 1, rotation: 0, duration: 0.4, ease: "back.out(2)" }, 0.5)
        .call(() => name.current?.element?.focus({ preventScroll: true }), [], 1.3);
      fields().forEach((field, index) => field?.enter(0.45 + index * 0.22));
      send.current?.enter(1.35);

      leave.current = contextSafe(() => {
        intro.kill();
        for (const field of fields()) {
          field?.exit();
        }
        send.current?.exit();
        gsap
          .timeline({ defaults: { overwrite: "auto" }, onComplete: onClose })
          .to(card, { autoAlpha: 0, scale: 0.92, y: 24, duration: 0.28, ease: "power2.in" }, 0)
          .to(backdrop, { autoAlpha: 0, duration: 0.3, ease: "power2.in" }, 0.1);
      });
    },
    { scope: overlay },
  );

  // Once sent, the fields are gone and the thanks scatter in.
  useGSAP(
    () => {
      const note = thanks.current;
      if (!sent || !note) {
        return;
      }
      const title = note.querySelector<HTMLElement>("h3");
      const rest = gsap.utils.toArray<HTMLElement>("[data-thanks-item]", note);
      if (prefersReducedMotion()) {
        gsap.set([note, title, ...rest], { autoAlpha: 1 });
        closeButton.current?.focus();
        return;
      }
      gsap.set(note, { autoAlpha: 1 });
      gsap
        .timeline()
        .add(charsCascadeIn(title), 0)
        .fromTo(rest, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power3.out", stagger: 0.12 }, 0.35)
        .call(() => closeButton.current?.focus({ preventScroll: true }), [], 0.6);
    },
    { scope: overlay, dependencies: [sent] },
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        leave.current();
        return;
      }
      // Keep Tab inside the dialog.
      if (event.key === "Tab" && panel.current) {
        const focusable = Array.from(
          panel.current.querySelectorAll<HTMLElement>("input, textarea, button, [href]"),
        ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) {
          return;
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const card = panel.current;
    if (!card) {
      return;
    }
    if (prefersReducedMotion()) {
      setSent(true);
      return;
    }
    for (const field of fields()) {
      field?.blast();
      field?.element?.blur();
    }
    send.current?.blast();
    gsap
      .timeline({ defaults: { overwrite: "auto" } })
      .to(card, { x: () => gsap.utils.random(-10, 10), y: () => gsap.utils.random(-6, 6), duration: 0.04, repeat: 7, yoyo: true, ease: "none" }, 0)
      .set(card, { clearProps: "transform" })
      .to("[data-form-body]", { autoAlpha: 0, y: -16, duration: 0.3, ease: "power2.in" }, 0.35)
      .call(() => setSent(true), [], SEND_HOLD);
  };

  return createPortal(
    <div
      ref={overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto bg-canvas/85 px-gutter py-10 backdrop-blur-sm sm:px-gutter-lg"
      onClick={(event) => {
        if (event.target === overlay.current) {
          leave.current();
        }
      }}
    >
      <div
        ref={panel}
        className="relative w-full max-w-2xl rounded-xl border-2 border-foreground bg-canvas p-6 sm:p-10 [container-type:inline-size]"
      >
        <div className="flex items-start justify-between gap-6">
          <h2 ref={heading} id="contact-title" className={`${HEADING} invisible`}>
            {sent ? "" : "Say hi"}
          </h2>
          <button
            ref={closeButton}
            type="button"
            onClick={() => leave.current()}
            aria-label="Close"
            className={`${CLOSE} invisible`}
          >
            ×
          </button>
        </div>

        {sent ? (
          <div ref={thanks} className="invisible">
            <h3 className={HEADING}>Sent</h3>
            <p data-thanks-item className="mt-6 max-w-[42ch] font-sans text-lead text-muted">
              We&rsquo;ll be in touch. Your site is about to have so much aura.
            </p>
            <p data-thanks-item className="mt-8">
              <button type="button" onClick={() => leave.current()} className={SEND}>
                Close
              </button>
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} data-form-body className="mt-8 flex flex-col gap-8">
            <FormField ref={name} id="contact-name" label="Name" placeholder="Your name" required />
            <FormField ref={email} id="contact-email" label="Email" type="email" placeholder="you@yoursite.com" required />
            <FormField ref={site} id="contact-site" label="Website" type="url" placeholder="https://yoursite.com" />
            <FormField ref={message} id="contact-message" label="What needs animaxxing" placeholder="Everything." multiline />
            <div className="mt-2">
              <ParticleButton ref={send} effect={reactor} className={SEND} type="submit">
                Send it
              </ParticleButton>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
