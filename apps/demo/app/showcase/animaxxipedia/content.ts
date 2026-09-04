/*
 * The article, restructured.
 *
 * Wikipedia's "Octopus" keeps its eight top-level sections and their order;
 * every section becomes a numbered chapter and every subsection keeps its
 * place under it. The prose is a condensed retelling of the source article,
 * written for a narrow measure; the sourced, footnoted version is one chip
 * away in every subsection.
 */

const WP = "https://en.wikipedia.org/wiki/Octopus";
const COMMONS = "https://upload.wikimedia.org/wikipedia/commons";

export const SOURCE = {
  url: WP,
  license: "CC BY-SA 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  retrieved: "2026-09-02",
  citations: 305,
  languages: 112,
} as const;

export type Figure = {
  src: string;
  alt: string;
  caption: string;
  /** Width over height, as CSS `aspect-ratio` accepts it. */
  aspect: string;
  /** Lets one figure run past the body column to the grid's edge. */
  bleed?: boolean;
};

export type Fact = {
  value: string;
  unit?: string;
  label: string;
  /** The three-hearts callout carries its own pulse. */
  hearts?: boolean;
};

export type Subsection = {
  id: string;
  title: string;
  paragraphs: string[];
  /** Fragment of the Wikipedia section this retells. */
  anchor: string;
  figure?: Figure;
  fact?: Fact;
  /** The camouflage band flips the page to off-white. */
  inverted?: boolean;
};

export type Chapter = {
  number: string;
  id: string;
  title: string;
  /** The rail's short name. */
  short: string;
  subsections: Subsection[];
};

export const HATNOTE =
  "This article is about the order of cephalopod. For other uses, see Octopus (disambiguation).";

export const LEAD =
  "An octopus is a soft-bodied, eight-limbed mollusc of the order Octopoda. Some 300 species share the class Cephalopoda with squid, cuttlefish and nautiloids. Two eyes and a beaked mouth sit at the centre of eight limbs, and the whole animal can deform to squeeze through a gap far smaller than itself. It swims backwards, arms trailing, on a jet of water from its siphon. With a complex nervous system and excellent sight, octopuses are among the most intelligent and behaviourally varied of all invertebrates.";

export const LEAD_EMPHASIS = ["eight-limbed", "300", "squeeze", "intelligent"];

export const TAXONOMY: { rank: string; name: string; note?: string }[] = [
  { rank: "Kingdom", name: "Animalia" },
  { rank: "Phylum", name: "Mollusca" },
  { rank: "Class", name: "Cephalopoda" },
  { rank: "Division", name: "Neocoleoidea" },
  { rank: "Clade", name: "Vampyropoda" },
  { rank: "Superorder", name: "Octopodiformes" },
  { rank: "Order", name: "Octopoda", note: "Leach, 1818" },
  { rank: "Suborders", name: "Cirrina, Incirrina", note: "traditional" },
  { rank: "Synonym", name: "Octopoida", note: "Leach, 1817" },
];

export const TEMPORAL_RANGE = {
  from: "Middle Jurassic",
  fromAge: "c. 170 Ma",
  to: "Recent",
  /** Where the bar starts, as a share of the ruler from Precambrian to now. */
  start: 0.62,
};

export const INFOBOX_FIGURE: Figure = {
  src: `${COMMONS}/thumb/5/57/Octopus2.jpg/960px-Octopus2.jpg`,
  alt: "A common octopus resting on the sea floor",
  caption: "Common octopus, Octopus vulgaris",
  aspect: "250 / 191",
};

export const CHAPTERS: Chapter[] = [
  {
    number: "01",
    id: "etymology",
    title: "Etymology and pluralisation",
    short: "Etymology",
    subsections: [
      {
        id: "etymology-plural",
        title: "Eight feet, three plurals",
        anchor: "Etymology_and_pluralisation",
        paragraphs: [
          "The scientific Latin name comes from the Ancient Greek oktōpous, a compound of oktō, eight, and pous, foot. A variant of the word appears in the writings of Alexander of Tralles in the sixth century.",
          "English has used three plurals. Octopuses is the standard form. Octopodes follows the Greek and has been used historically, and is rare enough that dictionaries call it pedantic. Octopi arrived first, in the early nineteenth century, but rests on the mistaken idea that the word is a Latin second-declension noun. Fowler's Modern English Usage accepts only octopuses. The Oxford English Dictionary lists all three in order of frequency and notes that octopi is based on a misunderstanding.",
        ],
        fact: { value: "3", label: "Plurals in use. One of them is wrong." },
      },
    ],
  },
  {
    number: "02",
    id: "anatomy",
    title: "Anatomy and physiology",
    short: "Anatomy",
    subsections: [
      {
        id: "size",
        title: "Size",
        anchor: "Size",
        paragraphs: [
          "The giant Pacific octopus, Enteroctopus dofleini, is usually cited as the largest species. Adults typically weigh 10 to 50 kilograms with an arm span of up to 4.8 metres. The largest specimen scientifically documented weighed 71 kilograms alive; far bigger animals have been claimed but never confirmed. A carcass of the seven-arm octopus, Haliphron atlanticus, weighed 61 kilograms and was estimated at 75 kilograms in life.",
          "At the other end of the scale, Octopus wolfi is around 2.5 centimetres long and weighs less than a gram.",
        ],
        figure: {
          src: `${COMMONS}/thumb/c/cf/North_Pacific_Giant_Octopus.JPG/960px-North_Pacific_Giant_Octopus.JPG`,
          alt: "A giant Pacific octopus pressed against aquarium glass",
          caption: "Giant Pacific octopus, Echizen Matsushima Aquarium, Japan",
          aspect: "4 / 3",
        },
        fact: { value: "4.8", unit: "m", label: "Arm span, giant Pacific octopus" },
      },
      {
        id: "external",
        title: "External characteristics",
        anchor: "External_characteristics",
        paragraphs: [
          "The body is bilaterally symmetrical along its back-to-belly axis. The head carries the mouth and the brain, and the mouth has a sharp chitinous beak. Around and beneath it is the foot, which evolved into eight prehensile arms joined near their base by a web. The arms are named by side and position, L1 to L4 and R1 to R4. The rear pair usually walks the sea floor while the other six forage. The hollow mantle behind the head holds most of the vital organs, a pair of gills, and a muscular cavity that opens to the outside through the funnel, or siphon.",
          "The skin is a thin epidermis over a collagen dermis carrying the cells that change colour. Almost all of the body is soft tissue, so even a large octopus can pass through an opening little more than 2.5 centimetres across. Without a skeleton the arms work as muscular hydrostats: longitudinal, transverse and circular muscle around a central nerve lets them stretch, coil in any direction, or stiffen.",
          "Each arm carries rows of circular suckers, an outer disc-shaped infundibulum around an inner cup-like acetabulum. Sealing the orifice between them and flattening the outer disc attaches the sucker; muscle releases it. Every arm senses light, so the octopus can steer its limbs even with its head hidden. Two cartilaginous capsules in the cranium hold the large, fish-like eyes with a slit pupil and a retina that screens bright light with pigment. The basal Cirrina depart from the plan with gelatinous bodies, two fins above the eyes, an internal shell and arms fringed with cirri.",
        ],
        figure: {
          src: `${COMMONS}/e/ea/Schematic_lateral_aspect_of_octopod_features.jpg`,
          alt: "Labelled side view of an octopus",
          caption:
            "Side view, labelled: gills, funnel, eye, ocellus, web, arms, suckers, hectocotylus, ligula",
          aspect: "400 / 170",
          bleed: true,
        },
        fact: { value: "2.5", unit: "cm", label: "Gap a large octopus can pass through" },
      },
      {
        id: "circulation",
        title: "Circulatory system",
        anchor: "Circulatory_system",
        paragraphs: [
          "Octopuses have a closed circulation and three hearts: one systemic heart that drives blood around the body and two branchial hearts that push it through the gills. The systemic heart stops while the animal swims, which is why swimming tires an octopus quickly and why it mostly crawls.",
          "The blood carries oxygen on haemocyanin, a copper-rich protein dissolved in the plasma rather than held in cells. It makes the blood viscous and blue, and it takes pressure above 75 millimetres of mercury to move it. In cold, oxygen-poor water haemocyanin outperforms haemoglobin. Arteries, capillaries and veins are lined with an endothelium unusual among invertebrates, and much of the venous system contracts to help the flow along.",
        ],
        fact: { value: "3", label: "Hearts. The main one stops when it swims.", hearts: true },
      },
      {
        id: "respiration",
        title: "Respiration",
        anchor: "Respiration",
        paragraphs: [
          "Water is drawn into the mantle cavity through an aperture, passed over the gills, and driven out through the siphon. Radial muscles in the mantle wall pull water in; flapper valves close and circular muscles squeeze it out. The gills' lamellae take up as much as 65 percent of the oxygen in water at 20 degrees Celsius, and the same jet that ventilates the gills can drive the animal through the water.",
          "The thin skin breathes too. At rest around 41 percent of oxygen uptake is through the skin, falling to 33 percent while swimming and to as little as 3 percent while digesting a meal.",
        ],
        figure: {
          src: `${COMMONS}/thumb/7/70/Octopus_vulgaris_Cuvier%2C_1797_2.jpg/960px-Octopus_vulgaris_Cuvier%2C_1797_2.jpg`,
          alt: "An octopus with its siphon open",
          caption: "Siphon open. It handles breathing, waste, and ink.",
          aspect: "250 / 233",
        },
        fact: { value: "41", unit: "%", label: "Oxygen absorbed through the skin at rest" },
      },
      {
        id: "digestion",
        title: "Digestion and excretion",
        anchor: "Digestion_and_excretion",
        paragraphs: [
          "Digestion starts in the buccal mass: mouth, beak, pharynx, a serrated chitinous radula, and salivary glands. Food moves through a crop for storage, a stomach for mixing, a caecum that separates particles from liquid and absorbs fat, and a digestive gland where the fluid is broken down. Waste leaves through the intestine and out of the funnel.",
          "Two kidneys clear nitrogenous waste as ammonia, and their renal appendages sit on the veins so that blood pressure drives filtration.",
        ],
      },
      {
        id: "nervous",
        title: "Nervous system and senses",
        anchor: "Nervous_system_and_senses",
        paragraphs: [
          "Along with the cuttlefish, the octopus has the highest brain-to-body ratio of any invertebrate, with around 500 million neurons. Two thirds of them are in the arms, not the brain. Each arm has its own nerve cord and can carry out reflex actions without instruction from the centre. The brain itself is a set of lobes wrapped around the oesophagus, with large optic lobes for the eyes.",
          "Vision is excellent, though most species are colour-blind; the slit pupil and polarisation sensitivity may compensate. Statocysts detect orientation and gravity. The suckers taste what they touch through chemoreceptors, and the whole skin is sensitive to light through its own opsins.",
        ],
        figure: {
          src: `${COMMONS}/thumb/5/50/Reef1072_-_Flickr_-_NOAA_Photo_Library.jpg/960px-Reef1072_-_Flickr_-_NOAA_Photo_Library.jpg`,
          alt: "Close view of a common octopus eye",
          caption: "Eye of a common octopus",
          aspect: "4 / 3",
        },
        fact: { value: "500", unit: "M", label: "Neurons. Two thirds of them are in the arms." },
      },
      {
        id: "ink",
        title: "Ink sac",
        anchor: "Ink_sac",
        paragraphs: [
          "The ink sac opens into the rectum and is filled by an ink gland whose melanin gives the ink its black colour. Mucus glands thicken it on the way out, so a discharge can hang in the water as a cloud or a decoy shape rather than dispersing at once. The deep-sea Cirrina have no ink sac at all.",
        ],
      },
    ],
  },
  {
    number: "03",
    id: "life-cycle",
    title: "Life cycle",
    short: "Life cycle",
    subsections: [
      {
        id: "reproduction",
        title: "Reproduction",
        anchor: "Reproduction",
        paragraphs: [
          "Octopuses are gonochoric and mate once, late in life. The male's third right arm is modified into a hectocotylus that carries sperm packets into the female's mantle cavity. In the argonauts the arm detaches entirely and swims to the female on its own. Courtship is brief, sometimes accompanied by colour display; in some species the male mates from a distance, keeping clear of a partner that might eat him.",
          "The female lays tens of thousands of eggs in a den or under a rock, then aerates and guards them for weeks to months without feeding. The male grows senescent and dies soon after mating; the female dies soon after the eggs hatch. Most hatchlings are planktonic paralarvae that drift for weeks before settling. A few large-egged species skip the drift and hatch as miniature adults.",
        ],
        figure: {
          src: `${COMMONS}/thumb/3/39/Enteroctopus_dofleini_to_spawn.jpg/960px-Enteroctopus_dofleini_to_spawn.jpg`,
          alt: "A female giant Pacific octopus guarding strings of eggs",
          caption: "Female giant Pacific octopus guarding strings of eggs",
          aspect: "3 / 2",
        },
      },
      {
        id: "lifespan",
        title: "Lifespan",
        anchor: "Lifespan",
        paragraphs: [
          "Life is short. Some species live for as little as six months; the giant Pacific octopus can reach five years. Reproduction ends it: the optic glands release hormones that switch off feeding, and the animal dies within weeks of mating or brooding. Removing the glands lets an octopus feed and live on, which shows that the timing is set by the glands rather than by age.",
        ],
        fact: { value: "5", unit: "yr", label: "Longest lifespan. Six months is common." },
      },
    ],
  },
  {
    number: "04",
    id: "habitat",
    title: "Distribution and habitat",
    short: "Habitat",
    subsections: [
      {
        id: "distribution",
        title: "Every ocean, every depth",
        anchor: "Distribution_and_habitat",
        paragraphs: [
          "Octopuses live in every ocean and are adapted to nearly every marine habitat: coral reefs, open water, the sea floor, the intertidal zone and the abyss. None live in fresh water. Most are benthic and solitary, keeping to a den, though a few species tolerate neighbours and the pelagic argonauts drift near the surface. Cold water does not exclude them; Cirrina are recorded below 3,000 metres.",
        ],
        figure: {
          src: `${COMMONS}/thumb/e/ed/Octopus_cyaneain_Kona.jpg/960px-Octopus_cyaneain_Kona.jpg`,
          alt: "A day octopus on a reef",
          caption: "Octopus cyanea, Kona, Hawaii",
          aspect: "1 / 1",
        },
      },
    ],
  },
  {
    number: "05",
    id: "behaviour",
    title: "Behaviour and ecology",
    short: "Behaviour",
    subsections: [
      {
        id: "feeding",
        title: "Feeding",
        anchor: "Feeding",
        paragraphs: [
          "Almost all octopuses are predators. Bottom-dwelling species take crabs, polychaete worms and other molluscs such as whelks and clams; open-water species take prawns, fish and other cephalopods. Prey is found by touch and sight, pounced on, and pulled to the beak with the arms. The beak bites, toxic saliva paralyses, and the radula or saliva bores through a shell that cannot be pulled apart. Larger species wrap their prey in the web and take it back to the den to eat.",
        ],
        figure: {
          src: `${COMMONS}/thumb/f/f1/Veined_Octopus_-_Amphioctopus_Marginatus_eating_a_Crab.jpg/960px-Veined_Octopus_-_Amphioctopus_Marginatus_eating_a_Crab.jpg`,
          alt: "A veined octopus holding a crab",
          caption: "Veined octopus eating a crab",
          aspect: "4 / 3",
        },
      },
      {
        id: "locomotion",
        title: "Locomotion",
        anchor: "Locomotion",
        paragraphs: [
          "Crawling is the usual gait: the arms reach out, suckers grip, and the body is hauled along, with no fixed order among the limbs. For speed the octopus jets, squeezing water out of the siphon and travelling mantle first with the arms trailing behind. Jetting is fast but costly, since the main heart stops while it lasts. Some species swim by flapping the web, and the finned Cirrina row with their fins. A few species walk bipedally on two arms, rolling the other six up to pass as a coconut or a clump of algae.",
        ],
        figure: {
          src: `${COMMONS}/thumb/3/33/Octopus3.jpg/960px-Octopus3.jpg`,
          alt: "An octopus swimming with arms trailing",
          caption: "Swimming, arms trailing behind",
          aspect: "250 / 202",
        },
      },
      {
        id: "intelligence",
        title: "Intelligence",
        anchor: "Intelligence",
        paragraphs: [
          "Octopuses learn quickly, in the laboratory and in the wild. They solve mazes, remember solutions, distinguish shapes and patterns, and open jars for the food inside. They use tools: the veined octopus collects coconut shell halves and carries them around to assemble into a shelter. Play has been observed, with aquarium animals releasing objects into a current to catch them again. The distributed nervous system complicates the picture, since much of the behaviour is organised in the arms rather than the brain.",
        ],
        figure: {
          src: `${COMMONS}/thumb/a/a4/Oktopus_opening_a_container_with_screw_cap_02_%28cropped%29.jpg/960px-Oktopus_opening_a_container_with_screw_cap_02_%28cropped%29.jpg`,
          alt: "An octopus unscrewing the cap of a container",
          caption: "Opening a container by unscrewing its cap",
          aspect: "190 / 221",
        },
      },
      {
        id: "camouflage",
        title: "Camouflage and colour change",
        anchor: "Camouflage_and_colour_change",
        inverted: true,
        paragraphs: [
          "The skin is a display. Chromatophores, sacs of pigment worked by muscle, open and close under direct nervous control to change colour in a fraction of a second. Beneath them, reflective iridophores and white leucophores shape the light that passes through. Muscular papillae raise the skin into bumps and ridges to match rock, sand or coral. The result is a match for the background in colour, pattern and texture, achieved by an animal that is probably colour-blind.",
          "The same machinery signals. Colour and posture warn rivals and predators, a passing dark wave over the body startles prey, and the mimic octopus goes further and impersonates lionfish, sea snakes and flatfish.",
        ],
        figure: {
          src: `${COMMONS}/thumb/f/f2/Hapalochlaena_lunulata2.JPG/960px-Hapalochlaena_lunulata2.JPG`,
          alt: "A blue-ringed octopus displaying its rings",
          caption: "Warning display of the greater blue-ringed octopus",
          aspect: "190 / 239",
        },
      },
      {
        id: "defence",
        title: "Defence",
        anchor: "Defence",
        paragraphs: [
          "Camouflage comes first: an octopus that is not seen is not eaten. Found out, it can jet away, release a cloud of ink to hide the escape or a blob to draw the attack, or threaten with a display of size and contrast. Some species can shed an arm and grow it back. Many mimic more dangerous animals, and the blue-ringed octopuses back their warning rings with a bite that kills. Predators include fish, seabirds, sea otters, pinnipeds, cetaceans and other cephalopods.",
        ],
      },
      {
        id: "parasites",
        title: "Pathogens and parasites",
        anchor: "Pathogens_and_parasites",
        paragraphs: [
          "The diseases of octopuses are poorly known. A range of protozoan and metazoan parasites has been recorded, including copepods, nematodes, flukes and cestodes. Bacterial infection in captivity is well documented. The blue-ringed octopus carries the tetrodotoxin that makes its bite deadly in symbiotic bacteria of its salivary glands.",
        ],
      },
    ],
  },
  {
    number: "06",
    id: "evolution",
    title: "Evolution",
    short: "Evolution",
    subsections: [
      {
        id: "fossils",
        title: "Fossil history and phylogeny",
        anchor: "Fossil_history_and_phylogeny",
        paragraphs: [
          "Soft bodies rarely fossilise, so the record is thin. The octopuses evolved from the Muensterelloidea in the Jurassic, and the oldest known octopus fossils date to the Middle Jurassic. Within the coleoids, the Octopodiformes sit alongside the vampire squid in the clade Vampyropoda, apart from the squid and cuttlefish. The traditional split into Cirrina and Incirrina is not fully supported by molecular work, which recovers the finned octopuses as one clade and the rest as a grade around it.",
        ],
        figure: {
          src: `${COMMONS}/thumb/2/29/Muensterella_scutellaris_348.jpg/960px-Muensterella_scutellaris_348.jpg`,
          alt: "A fossil of Muensterella scutellaris",
          caption: "Muensterella, the group octopuses evolved from",
          aspect: "250 / 178",
        },
      },
      {
        id: "genome",
        title: "RNA editing and the genome",
        anchor: "RNA_editing_and_the_genome",
        paragraphs: [
          "Octopuses and other coleoids edit their messenger RNA far more than other animals do, recoding a large fraction of the proteins in the nervous system rather than mutating the DNA. The genome of the California two-spot octopus, sequenced in 2015, is large and rich in transposons and in gene families associated with neural development, including an expansion of protocadherins previously known mainly from vertebrates.",
        ],
      },
    ],
  },
  {
    number: "07",
    id: "humans",
    title: "Relationship to humans",
    short: "Humans",
    subsections: [
      {
        id: "culture",
        title: "Cultural significance",
        anchor: "Cultural_significance",
        paragraphs: [
          "The octopus is a sea monster in many traditions: the kraken of Norway, the Akkorokamui of the Ainu, and possibly the Gorgons of Greece. Minoan potters painted it on vases around 1500 BC. Victor Hugo staged a fight with one in Toilers of the Sea, Japanese shunga prints made it erotic, and twentieth-century cartoons made it the emblem of any organisation with too many arms.",
        ],
        figure: {
          src: `${COMMONS}/9/9d/Colossal_octopus_by_Pierre_Denys_de_Montfort.jpg`,
          alt: "A drawing of an imagined colossal octopus attacking a ship",
          caption: "Colossal octopus attacking a ship, Pierre Denys de Montfort, 1801",
          aspect: "190 / 292",
        },
      },
      {
        id: "danger",
        title: "Danger to humans",
        anchor: "Danger_to_humans",
        paragraphs: [
          "Every octopus is venomous, but only the blue-ringed octopuses are known to be deadly. Their tetrodotoxin paralyses; there is no antivenom, and treatment is artificial respiration until the toxin clears. Bites from other species are painful and rarely serious. Stories of divers dragged down by giant octopuses are not supported by any documented case.",
        ],
        fact: { value: "1", label: "Genus known to be deadly to humans" },
      },
      {
        id: "food",
        title: "As a food source",
        anchor: "As_a_food_source",
        paragraphs: [
          "Octopus is eaten across the Mediterranean and East Asia and is a staple of Korean, Japanese and Greek cooking. Arms are the main cut; the head and ink are used too. In some places it is served alive. Aquaculture is difficult because of the planktonic paralarvae and has drawn objections on welfare grounds.",
        ],
        figure: {
          src: `${COMMONS}/thumb/e/ef/Tako_nigiri_2.jpg/960px-Tako_nigiri_2.jpg`,
          alt: "Octopus sushi",
          caption: "Tako nigiri",
          aspect: "250 / 141",
        },
      },
      {
        id: "science",
        title: "Science and technology",
        anchor: "Science_and_technology",
        paragraphs: [
          "The arm is a model for soft robotics: a limb that bends anywhere, grips anything and needs no skeleton. Research groups have built biomimetic octopus arms and prosthetics on the same principle. Neuroscientists study the distributed nervous system, and the octopus is the first invertebrate protected by animal research legislation in the United Kingdom and the European Union.",
        ],
        figure: {
          src: `${COMMONS}/thumb/7/7d/OCTOPUS_arm1.JPG/960px-OCTOPUS_arm1.JPG`,
          alt: "A flexible biomimetic robot arm modelled on an octopus arm",
          caption: "Biomimetic arm, the BioRobotics Institute, Pisa",
          aspect: "250 / 188",
        },
      },
    ],
  },
];

export const SEE_ALSO = ["Cephalopod intelligence", "Cephalopod size", "Octopus (genus)"];

export const SOURCES_CHAPTER = { number: "08", id: "sources", title: "Sources", short: "Sources" };
