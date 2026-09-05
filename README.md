# Animaxxing

Agent skills that teach your coding agent to animate the shit out of your website with GSAP. This repo is the demo site, [animaxxing.com](https://animaxxing.com), built with those skills to show what they can do.

**The skills live in [johnpolacek/animaxxing-skills](https://github.com/johnpolacek/animaxxing-skills).** Start there.

## Install the skills

```bash
npx skills add https://github.com/greensock/gsap-skills && npx skills add https://github.com/johnpolacek/animaxxing-skills
```

That gives your agent two sets of skills:

- **[animaxxing-skills](https://github.com/johnpolacek/animaxxing-skills)** — `aesthetic-animaxxing`, the Animaxxing look, plus a framework skill for the lifecycle of mount, intro, outro, and cleanup: `gsap-nextjs`, `gsap-astro`, `gsap-sveltekit`, `gsap-nuxt`, `gsap-react-router`, `gsap-tanstack-router`, and `gsap-vanilla`.
- **[gsap-skills](https://github.com/greensock/gsap-skills)** — the official GSAP skills for the core API, timelines, ScrollTrigger, plugins, utils, performance, React, and other frameworks.

Then tell your agent what you want. Some prompts that work:

- "Animaxx it. Use the aesthetic-animaxxing skill with the gsap skill for this framework and redesign this site in the Animaxxing look."
- "Use the gsap skill for this framework to add page transitions. Headlines scatter in letter by letter, everything else rises, and the outro finishes before navigation."
- "Keep my design and colors. Add the Animaxxing motion only: split-text entrances on headings, reveals on scroll, and one ambient effect on the home page."
- "We need to be way more creative with the animation for this website. We need to aniMAXX! Animate the shit out of it!"

The [/animaxx](https://animaxxing.com/animaxx) page on the demo site walks through the same install with more prompts.

## Run the demo

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

- `pnpm build` creates a production build.
- `pnpm start` serves the production build.
- `pnpm typecheck` generates Next.js route types and runs TypeScript.

## Project structure

```text
animaxxing/
├── app/                  App Router pages, layouts, and route-specific UI
├── components/           Shared motion, theme, and UI components
├── lib/                  Animation effects and page state utilities
├── .agents/skills/       The installed skills, pinned in skills-lock.json
└── skills-lock.json      Skill sources and hashes
```

The demo is maintained with the same skills it demonstrates. Update the installed copies with:

```bash
npx skills update -p -y
```
