/*
 * What the install page hands out: the one command that installs the skills,
 * and things to say to an agent once they are in.
 */
export const SKILLS_REPO = "https://github.com/johnpolacek/animaxxing-skills";

export const INSTALL =
  "npx skills add https://github.com/greensock/gsap-skills && npx skills add https://github.com/johnpolacek/animaxxing-skills";

export type Prompt = { label: string; text: string };

export const PROMPTS: Prompt[] = [
  {
    label: "Prompt 01 · Explore",
    text: "Analyze this site, then make an animation exploration page for it. Create a directory outside the project with four HTML pages, each a different direction for animating the site, plus an index that links them, so I can compare the directions before picking one.",
  },
  {
    label: "Prompt 02 · Redesign",
    text: "Animaxx it. Use the aesthetic-animaxxing skill with the gsap skill for this framework and redesign this site in the Animaxxing look.",
  },
  {
    label: "Prompt 03 · Page transitions",
    text: "Use the gsap skill for this framework to add page transitions. Headlines scatter in letter by letter, everything else rises, and the outro finishes before navigation.",
  },
  {
    label: "Prompt 04 · The hero",
    text: "Animaxx the hero. Split-text entrance on the headline, speak the subhead in word by word, and particle treatments on the calls to action.",
  },
  {
    label: "Prompt 05 · Keep my design",
    text: "Keep my design and colors. Add the Animaxxing motion only: split-text entrances on headings, reveals on scroll, and one ambient effect on the home page.",
  },
  {
    label: "Prompt 06 · Particles",
    text: "Use the aesthetic-animaxxing skill to add a particle animation. Assemble the logo and the primary button out of particles on load, and scatter them again on hover and on exit.",
  },
  {
    label: "Prompt 07 · Animaxx everything",
    text: "We need to be way more creative with the animation for this website. We need to aniMAXX! Animate the shit out of it!",
  },
];
