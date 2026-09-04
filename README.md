# Animaxxing

An interactive Next.js demo of expressive, production-ready web animation with GSAP. Explore motion patterns, animated page transitions, particle effects, and animaxxed takes on familiar interfaces.

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the demo.

## Project structure

```text
animaxxing/
├── app/                  App Router pages, layouts, and route-specific UI
├── components/           Shared motion, theme, and UI components
├── lib/                  Animation effects and page state utilities
├── next.config.ts        Next.js configuration
├── package.json          Dependencies and scripts
└── tsconfig.json         TypeScript configuration
```

## Scripts

- `pnpm dev` starts the local development server.
- `pnpm build` creates a production build.
- `pnpm start` serves the production build.
- `pnpm typecheck` generates Next.js route types and runs TypeScript.

## Animation guidance

The repository includes the Animaxxing and official GSAP agent skills used to maintain the demo. They are installed under `.agents/skills` and pinned in `skills-lock.json`.

Update them with:

```bash
npx skills update -p -y
```
