import type { ExplorationSlug } from "./explorations";

/*
 * Tiny posters, one per exploration, drawn entirely in CSS so the picker
 * needs none of the explorations' images. Each fills a square and is
 * decorative: the tile's visible name is the only text a reader needs.
 * Faces are named outright, since font-sans and font-mono follow the look.
 */
export function ThemePreview({ slug }: { slug: ExplorationSlug }) {
  switch (slug) {
    case "posterize":
      return (
        <div className="@container relative h-full w-full overflow-hidden bg-canvas text-foreground">
          <div className="absolute inset-x-[8%] top-[10%] h-px bg-foreground" />
          <div className="absolute left-[8%] top-[13%] font-[family-name:var(--font-jetbrains-mono)] text-[0.4rem] uppercase tracking-[0.1em] text-muted">
            Motion to the
          </div>
          <div className="absolute inset-x-0 bottom-[6%] text-center font-[family-name:var(--font-rethink-sans)] text-[46cqi] font-extrabold uppercase leading-[0.8] tracking-[-0.06em] opacity-75">
            MAX
          </div>
        </div>
      );
    case "bauhaus":
      return (
        <div className="relative h-full w-full overflow-hidden bg-[#f1ece1] text-[#141414]">
          <div className="absolute left-[10%] top-[12%] h-[38%] w-[38%] rounded-full bg-[#1a4c96]" />
          <div className="absolute right-[8%] top-[8%] h-[34%] w-[34%] bg-[#f0b323]" />
          <div
            className="absolute bottom-[10%] right-[14%] h-[40%] w-[40%] bg-[#d6321f]"
            style={{ clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }}
          />
          <div className="absolute left-[-10%] top-[58%] h-[6%] w-[80%] rotate-[-28deg] bg-[#141414]" />
          <div className="absolute bottom-[24%] left-[10%] font-[family-name:var(--font-rethink-sans)] text-[2.6rem] font-extrabold leading-none tracking-[-0.06em]">
            max
            <span className="ml-0.5 inline-block h-[0.16em] w-[0.16em] bg-[#d6321f] align-baseline" />
          </div>
        </div>
      );
    case "cinematic":
      return (
        <div className="relative h-full w-full overflow-hidden bg-[#0b0b0c] text-[#f2ead8]">
          <div className="absolute inset-x-0 top-0 h-[14%] bg-black" />
          <div className="absolute inset-x-0 bottom-0 h-[14%] bg-black" />
          <div className="absolute inset-x-0 top-[14%] h-[72%] bg-[radial-gradient(ellipse_at_50%_60%,rgba(201,162,74,0.35),transparent_60%)]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <span className="font-[family-name:var(--font-inter)] text-[0.55rem] font-light uppercase tracking-[0.4em]">Motion to</span>
            <span className="font-[family-name:var(--font-cormorant)] text-[1.7rem] italic leading-none text-[#c9a24a]">the Max</span>
          </div>
          <div className="absolute bottom-[17%] left-1/2 h-px w-[40%] -translate-x-1/2 bg-[#c9a24a]/60" />
        </div>
      );
    case "constructivist":
      return (
        <div className="relative h-full w-full overflow-hidden bg-[#e8dfc9] text-[#141312]">
          <div
            className="absolute bottom-[-6%] left-[-10%] h-[70%] w-[120%] bg-[#c4271b]"
            style={{ clipPath: "polygon(0 100%, 100% 6%, 100% 100%)" }}
          />
          <div className="absolute right-[6%] top-[6%] grid h-[44%] w-[44%] place-items-center rounded-full bg-[#141312] font-[family-name:var(--font-anton)] text-[1.4rem] leading-none text-[#e8dfc9] outline outline-2 outline-offset-[3px] outline-[#141312]">
            <span>
              ▶<span className="-ml-[0.32em] text-[#c4271b]">▶</span>
            </span>
          </div>
          <div className="absolute left-[-6%] top-[84%] h-[5%] w-[112%] origin-left rotate-[-18deg] bg-[#141312]" />
          <div className="absolute bottom-[22%] left-[8%] origin-bottom-left rotate-[-18deg] whitespace-nowrap font-[family-name:var(--font-anton)] text-[1.5rem] uppercase leading-[0.85]">
            Motion to <span className="text-[#c4271b]">the Max</span>
          </div>
        </div>
      );
    case "earlyweb":
      return (
        <div className="relative h-full w-full overflow-hidden bg-[#c0c0c0] font-serif text-[#000]">
          <div className="flex h-[12%] items-center bg-[linear-gradient(90deg,#000080,#1084d0)] px-1.5 font-[family-name:var(--font-rethink-sans)] text-[0.45rem] font-bold text-white">
            Netscape
          </div>
          <div className="mx-[8%] mt-[6%] h-[7%] bg-[#ffff00] outline outline-1 outline-black" />
          <div className="mx-[8%] mt-[5%] h-[7%] bg-[repeating-linear-gradient(45deg,#000_0_4px,#ffff00_4px_8px)]" />
          <div className="mx-[8%] mt-[6%] flex gap-[6%]">
            <div className="flex w-[34%] flex-col gap-[6px] border-2 border-[#808080] bg-white p-1.5 [border-style:inset]">
              <span className="text-[0.5rem] text-[#0000ee] underline">Showcase</span>
              <span className="text-[0.5rem] text-[#551a8b] underline">Links</span>
              <span className="text-[0.5rem] text-[#0000ee] underline">Guestbook</span>
            </div>
            <div className="flex-1 border-2 border-[#808080] bg-white p-1.5 [border-style:inset]">
              <div className="bg-[linear-gradient(90deg,#f00,#ff0,#0f0,#00f)] bg-clip-text text-[0.95rem] font-bold leading-none text-transparent">
                MOTION!!!
              </div>
              <div className="mt-1.5 flex gap-px">
                {["0", "0", "4", "2", "0"].map((d, i) => (
                  <span key={i} className="bg-black px-[3px] font-[family-name:var(--font-jetbrains-mono)] text-[0.5rem] leading-[1.4] text-[#00ff00]">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    case "pinned":
      return (
        <div className="relative h-full w-full overflow-hidden bg-black text-[#f5f5f7]">
          <div className="absolute inset-x-0 top-0 flex h-[10%] items-center gap-2 border-b border-white/10 px-2">
            <span className="h-1 w-1 rounded-full bg-[#2997ff]" />
            <span className="h-[3px] w-[30%] rounded bg-white/20" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_55%,rgba(41,151,255,0.22),transparent_55%)]">
            <span className="font-[family-name:var(--font-rethink-sans)] text-[1.55rem] font-extrabold leading-none tracking-[-0.05em]">
              to the{" "}
              <span className="bg-[linear-gradient(90deg,#2997ff,#bf5af2,#ff375f)] bg-clip-text text-transparent">Max</span>
            </span>
          </div>
          <div className="absolute inset-x-[8%] bottom-[10%] h-px bg-white/15">
            <div className="h-full w-[62%] bg-[#2997ff]" />
          </div>
        </div>
      );
    case "strongbad":
      return (
        <div className="relative h-full w-full overflow-hidden bg-[#7ec8f2]">
          <div className="absolute inset-x-0 bottom-0 h-[22%] border-t-[3px] border-[#1b1b1b] bg-[#5cb531]" />
          <div className="absolute left-1/2 top-[14%] w-[72%] -translate-x-1/2 rounded-[10px_10px_4px_4px] border-[3px] border-[#1b1b1b] bg-[#d9d0b8] p-[6%] shadow-[4px_4px_0_#1b1b1b]">
            <div className="rounded-[5px] border-2 border-[#1b1b1b] bg-[#050a05] px-1.5 py-1 font-[family-name:var(--font-jetbrains-mono)] text-[0.5rem] leading-[1.35] text-[#40e340] [text-shadow:0_0_4px_rgba(64,227,64,.8)]">
              Dear Strong Bad,
              <br />
              animaxx it.
              <span className="ml-0.5 inline-block h-[0.7em] w-[0.5em] bg-[#40e340] align-middle" />
            </div>
          </div>
          <div className="absolute bottom-[8%] left-[18%] h-[16%] w-[26%] rounded-full border-[3px] border-[#1b1b1b] bg-[#c9302c]" />
          <div className="absolute bottom-[8%] right-[18%] h-[16%] w-[26%] rounded-full border-[3px] border-[#1b1b1b] bg-[#c9302c]" />
        </div>
      );
    case "ukiyoe":
      return (
        <div className="relative h-full w-full overflow-hidden bg-[#ede2c6] text-[#2a231d]">
          {/* Bokashi: the sky graded from indigo down into the paper. */}
          <div className="absolute inset-x-0 top-0 h-[44%] bg-[linear-gradient(180deg,#1e3a5f_0%,#2d5787_30%,rgba(157,188,203,0.5)_70%,transparent_100%)]" />
          <div className="absolute left-[56%] top-[8%] h-[26%] w-[26%] rounded-full bg-[#c23b2a] opacity-90" />
          <svg
            viewBox="0 0 100 60"
            preserveAspectRatio="none"
            className="absolute inset-x-0 bottom-0 h-[48%] w-full"
            aria-hidden="true"
          >
            <path d="M0 60V33c9-7 16-21 27-19 8 1 12 14 20 13 8-1 13-15 22-16 11-2 20 9 31 6V60z" fill="#9dbccb" />
            <path d="M0 60V42c11-9 18-22 28-20 8 1 13 14 21 13 8-1 13-13 21-14 10-2 20 8 30 5V60z" fill="#2d5787" />
            <path d="M0 60V48c12-7 20-18 29-16 7 2 12 12 19 12 7 0 12-10 20-11 9-1 19 7 32 4V60z" fill="#1e3a5f" />
            {/* The great crest, in three blues, curling to the right. */}
            <path
              d="M50 52c3-21 11-33 22-34 8-1 14 10 14 26-2-9-7-13-11-11 4 2 7 10 7 20-3-9-8-13-12-9-5 5-8 15-9 25z"
              fill="#1e3a5f"
            />
            <path
              d="M55 52c3-16 9-27 17-28 5-1 9 8 10 18-2-6-6-9-9-7 3 2 5 8 5 16-2-8-6-10-10-6-4 4-6 12-7 19z"
              fill="#2d5787"
            />
            <path
              d="M59 52c2-11 7-20 12-20 3 0 5 4 6 10-2-4-4-5-7-4 2 2 3 6 3 10-2-5-5-6-8-3-3 4-4 8-5 12z"
              fill="#9dbccb"
              opacity=".55"
            />
            {/* Foam claws along the curl. */}
            <g fill="#ede2c6">
              <circle cx="86" cy="38" r="2.2" />
              <circle cx="84" cy="43" r="1.8" />
              <circle cx="80" cy="47" r="1.4" />
              <circle cx="84" cy="30" r="1.7" />
              <circle cx="79" cy="24" r="1.4" />
              <circle cx="73" cy="19" r="1.1" />
              <circle cx="14" cy="41" r="1.3" />
              <circle cx="10" cy="45" r="1" />
            </g>
          </svg>
          <span className="absolute right-[8%] top-[44%] grid h-[26%] w-[14%] rotate-[-2deg] place-items-center bg-[#c23b2a] font-[family-name:var(--font-shippori-mincho-b1)] text-[0.6rem] font-extrabold leading-none text-[#ede2c6] shadow-[inset_0_0_0_1.5px_#ede2c6,inset_0_0_0_3px_#c23b2a] [text-orientation:mixed] [writing-mode:vertical-rl]">
            動
          </span>
          <div className="absolute left-[8%] top-[7%] font-[family-name:var(--font-shippori-mincho)] text-[1.15rem] font-medium leading-none text-[#ede2c6] [text-orientation:mixed] [writing-mode:vertical-rl]">
            Motion
          </div>
        </div>
      );
    case "random":
      return (
        <div className="relative h-full w-full overflow-hidden bg-[conic-gradient(from_20deg,#d6321f,#c9a24a,#c8102e,#ffff00,#2997ff,#7ec8f2,#c0392b,#1a4c96,#d6321f)]">
          <div className="absolute inset-[18%] grid place-items-center rounded-full bg-canvas font-[family-name:var(--font-jetbrains-mono)] text-[2.6rem] font-extrabold leading-none text-foreground">
            ?
          </div>
        </div>
      );
  }
}
