# Animaxxing

Animaxxing is a showcase for ambitious, production-ready navigation animation in Next.js with GSAP. It consumes the [Animaxxing skills](https://github.com/johnpolacek/animaxxing-skills) and the [official GSAP skills](https://github.com/greensock/gsap-skills) as installed dependencies and validates their guidance against a real app.

## Repository structure

```text
animaxxing/
├── apps/
│   └── demo/              Next.js showcase and integration test bed
├── .agents/skills/        Installed skills (managed by the skills CLI, do not edit)
├── .claude/skills/        Symlinks into .agents/skills for Claude Code
└── skills-lock.json       Pinned skill sources and hashes
```

### Skills

Skills are installed with the [skills CLI](https://github.com/vercel-labs/skills) and pinned in `skills-lock.json`. Do not edit anything under `.agents/skills`. Change a skill in its source repository, then update here.

- [`gsap-nextjs`](https://github.com/johnpolacek/animaxxing-skills) defines a mount-to-unmount animation lifecycle for Next.js App Router pages and components, with references for navigation, motion architecture, and verification.
- The `gsap-*` skills are the [official GSAP skills](https://github.com/greensock/gsap-skills). They provide the GSAP API, plugin, React, and performance knowledge that `gsap-nextjs` builds on.

To update to the latest published versions:

```bash
npx skills update -p -y
```

To reinstall from scratch:

```bash
npx skills add greensock/gsap-skills -a claude-code codex -s '*' -y
npx skills add johnpolacek/animaxxing-skills -a claude-code codex -s '*' -y
```

### Demo

[`apps/demo`](apps/demo) is the home of the animated Next.js site. The app should exercise the skill as a real consumer: every major transition pattern demonstrated here should also help validate the skill's guidance.

## Project principles

- Keep the skill portable and independent of the demo's visual design.
- Use the demo to prove the skill against realistic navigation, interruption, accessibility, responsive-layout, and cleanup requirements.
- Put reusable guidance in the skill and product-specific implementation in the demo.
- Treat production builds and browser verification as part of the demo's integration testing.
