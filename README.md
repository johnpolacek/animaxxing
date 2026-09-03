# Animaxxing

Animaxxing is both a agent skill and a showcase for ambitious, production-ready navigation animation in Next.js with GSAP.

## Repository structure

```text
animaxxing/
├── apps/
│   └── demo/              Next.js showcase and integration test bed
└── skills/
    ├── gsap-nextjs/       Next.js lifecycle and navigation skill
    └── gsap-*/            Official GreenSock GSAP skills
```

### Skill

[`skills/gsap-nextjs`](skills/gsap-nextjs) contains the distributable skill. It defines a mount-to-unmount animation lifecycle for Next.js App Router pages and components, along with focused references for navigation, motion architecture, and verification.

The other `skills/gsap-*` directories are the official skills installed from [GreenSock's `gsap-skills` repository](https://github.com/greensock/gsap-skills). They provide the GSAP API, plugin, React, and performance knowledge used by `gsap-nextjs`.

### Demo

[`apps/demo`](apps/demo) is the home of the animated Next.js site. The app should exercise the skill as a real consumer: every major transition pattern demonstrated here should also help validate the skill's guidance.

## Project principles

- Keep the skill portable and independent of the demo's visual design.
- Use the demo to prove the skill against realistic navigation, interruption, accessibility, responsive-layout, and cleanup requirements.
- Put reusable guidance in the skill and product-specific implementation in the demo.
- Treat production builds and browser verification as part of the demo's integration testing.
