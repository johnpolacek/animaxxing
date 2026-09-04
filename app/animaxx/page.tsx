import type { Metadata } from "next";
import { Label } from "@/components/ui";
import { Contact } from "./Contact";
import { INSTALL, PROMPTS, SKILLS_REPO } from "./content";
import { Headline } from "./Headline";
import { Reveal } from "./Reveal";
import { Terminal } from "./Terminal";

export const metadata: Metadata = {
  title: "Get Animaxxed — Animaxxing",
  description: "Have us animaxx your site, or install the agent skills and do it yourself.",
};

const SECTION = "font-sans text-display font-extrabold uppercase tracking-[-0.02em] sm:text-5xl";
const SHOUT = "font-sans text-statement font-extrabold uppercase";
const RULE = "h-px flex-1 bg-border";

/*
 * Two ways in: have us do it, or do it yourself. The headline scatters in
 * and hums; the button assembles out of sparks and opens the form; below
 * the rule, the headings cascade and scatter in as they are scrolled to and
 * every panel resolves out of a grid of dots.
 */
export default function GetAnimaxxed() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="px-gutter pt-10 pb-24 sm:px-gutter-lg">
        <div className="mx-auto w-full max-w-7xl [container-type:inline-size]">
          <Headline>Get Animaxxed</Headline>
          <Contact />

          <Reveal effect="wipe" delay={1.5} className="mt-24 flex items-center gap-6">
            <span aria-hidden="true" className={RULE} />
            <Label className="text-foreground">or</Label>
            <span aria-hidden="true" className={RULE} />
          </Reveal>

          <Reveal as="h2" effect="cascade" delay={1.65} className={`${SECTION} mt-24`}>
            Do it yourself
          </Reveal>
          <Reveal as="h3" effect="scatter" delay={1.8} className={`${SHOUT} mt-10`}>
            Get the skills
          </Reveal>
          <Terminal label="Terminal" text={INSTALL} delay={2} className="mt-8" />

          <Reveal as="h3" effect="scatter" className={`${SHOUT} mt-28 max-w-[22ch]`}>
            Then have your agents animate the shit out of your website
          </Reveal>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {PROMPTS.map((prompt) => (
              <Terminal key={prompt.label} label={prompt.label} text={prompt.text} />
            ))}
          </div>

          <Reveal effect="rise" className="mt-16">
            <a
              href={SKILLS_REPO}
              className="inline-flex items-center gap-3 font-mono text-caption uppercase text-muted transition-colors hover:text-foreground"
            >
              Read the skills on GitHub <span aria-hidden="true">→</span>
            </a>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
