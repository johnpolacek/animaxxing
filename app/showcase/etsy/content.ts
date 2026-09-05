/*
 * The marketplace, restructured.
 *
 * Etsy is four pages a buyer actually uses: the browse grid, one listing, the
 * shop behind it, and the cart. Every listing here is a fixed snapshot so the
 * server and the browser render the same page. The photographs are real
 * handmade objects from Wikimedia Commons, each credited on the page; the
 * shops, prices, and reviews are invented around them.
 */

export const CHAPTERS = [
  { id: "browse", number: "01", title: "Browse" },
  { id: "item", number: "02", title: "Item" },
  { id: "shop", number: "03", title: "Shop" },
  { id: "cart", number: "04", title: "Cart" },
] as const;

export const CATEGORIES = ["All", "Home", "Kitchen", "Jewelry", "Bags", "Bath"] as const;

export type Photo = {
  src: string;
  alt: string;
  /** Width over height of the file, so the frame is right before it loads. */
  ratio: number;
  /** Where the crop should sit when the frame is tighter than the file. */
  position?: string;
  credit: string;
  license: string;
  licenseUrl?: string;
  sourceUrl: string;
};

export type Listing = {
  id: string;
  title: string;
  shop: string;
  /** Cents, so totals add without drifting. */
  price: number;
  category: (typeof CATEGORIES)[number];
  rating: number;
  reviews: number;
  photo: Photo;
  /** Set on the few listings the buyer has already hearted. */
  favorite?: boolean;
  badge?: "Bestseller" | "Free shipping" | "Only 1 left";
};

const COMMONS = "https://commons.wikimedia.org/wiki/";
const BY_SA_4 = { license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" };
const BY_4 = { license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" };

export const LISTINGS: Listing[] = [
  {
    id: "board",
    title: "End grain cutting board, ombré walnut to ash",
    shop: "Fern & Grain",
    price: 18500,
    category: "Kitchen",
    rating: 4.9,
    reviews: 312,
    badge: "Bestseller",
    photo: {
      src: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/End_grain_cutting_board.jpg/1280px-End_grain_cutting_board.jpg",
      alt: "An end grain cutting board that shades from dark walnut on the left to pale ash on the right, with a juice groove.",
      ratio: 3 / 4,
      credit: "Hu Nhu",
      ...BY_SA_4,
      sourceUrl: `${COMMONS}File:End_grain_cutting_board.jpg`,
    },
  },
  {
    id: "basket",
    title: "Coiled banana fiber bowl, spiral weave",
    shop: "Kasese Weavers",
    price: 4800,
    category: "Home",
    rating: 5,
    reviews: 128,
    favorite: true,
    badge: "Free shipping",
    photo: {
      src: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Hand_woven_basket_01.jpg/1280px-Hand_woven_basket_01.jpg",
      alt: "A coiled basket seen from above, its weave spiraling out from the center in a chevron pattern.",
      ratio: 2176 / 2737,
      credit: "BalukuBrian",
      ...BY_SA_4,
      sourceUrl: `${COMMONS}File:Hand_woven_basket_01.jpg`,
    },
  },
  {
    id: "soap",
    title: "Cold process soap, three bar set",
    shop: "Nature Bar",
    price: 2400,
    category: "Bath",
    rating: 4.8,
    reviews: 1042,
    photo: {
      src: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Nature_Bar_handmade_soap_bar.jpg/1280px-Nature_Bar_handmade_soap_bar.jpg",
      alt: "Three bars of handmade soap stacked with lather on a plain backdrop in hard light.",
      ratio: 3535 / 4419,
      credit: "MarliesVH",
      ...BY_4,
      sourceUrl: `${COMMONS}File:Nature_Bar_handmade_soap_bar.jpg`,
    },
  },
  {
    id: "necklace",
    title: "Magpie's Nest, sterling silver necklace",
    shop: "ASQ Silver",
    price: 42000,
    category: "Jewelry",
    rating: 5,
    reviews: 41,
    badge: "Only 1 left",
    photo: {
      src: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Magpie%27s_Nest_-_silver_necklace_side_view.jpg/1280px-Magpie%27s_Nest_-_silver_necklace_side_view.jpg",
      alt: "A sterling silver necklace of crossed sticks, seen close from the side.",
      ratio: 2500 / 1406,
      credit: "W.carter",
      ...BY_SA_4,
      sourceUrl: `${COMMONS}File:Magpie%27s_Nest_-_silver_necklace_side_view.jpg`,
    },
  },
  {
    id: "tote",
    title: "Heavy canvas tote, navy stripe",
    shop: "Beatty Canvas Co.",
    price: 6800,
    category: "Bags",
    rating: 4.7,
    reviews: 509,
    favorite: true,
    photo: {
      src: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Canvas_two-tone_tote_Navy_and_Natural7_%289038437258%29.jpg/1280px-Canvas_two-tone_tote_Navy_and_Natural7_%289038437258%29.jpg",
      alt: "A canvas tote bag with wide navy stripes and a navy handle, against a dark backdrop.",
      ratio: 6016 / 4000,
      credit: "Tom Beatty",
      license: "CC BY 2.0",
      licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
      sourceUrl: `${COMMONS}File:Canvas_two-tone_tote_Navy_and_Natural7_(9038437258).jpg`,
    },
  },
  {
    id: "mug",
    title: "Stoneware mug, brushed rim",
    shop: "Mori Studio",
    price: 3200,
    category: "Kitchen",
    rating: 4.9,
    reviews: 866,
    photo: {
      src: "https://upload.wikimedia.org/wikipedia/commons/7/7e/1985_SekkiKumo-K-typeCoffeeCupMug_Masahiro-Mori.jpg",
      alt: "A pale stoneware mug and a cup on a saucer, each with a scalloped brushed line around the middle.",
      ratio: 960 / 640,
      credit: "Mori Masahiro Design Studio",
      license: "CC BY 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
      sourceUrl: `${COMMONS}File:1985_SekkiKumo-K-typeCoffeeCupMug_Masahiro-Mori.jpg`,
    },
  },
  {
    id: "bowl",
    title: "Celadon tea bowl, incised floral scroll",
    shop: "Goryeo Kiln",
    price: 9500,
    category: "Home",
    rating: 4.8,
    reviews: 73,
    photo: {
      src: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Tea_Bowl_with_Floral_Scrolls_LACMA_M.2000.15.71.jpg/1280px-Tea_Bowl_with_Floral_Scrolls_LACMA_M.2000.15.71.jpg",
      alt: "A shallow celadon tea bowl seen from above, with flowers incised under the glaze.",
      ratio: 2041 / 2100,
      credit: "LACMA",
      license: "Public domain",
      sourceUrl: `${COMMONS}File:Tea_Bowl_with_Floral_Scrolls_LACMA_M.2000.15.71.jpg`,
    },
  },
  {
    id: "challah",
    title: "Olive wood challah board, brick pattern",
    shop: "Fern & Grain",
    price: 14000,
    category: "Kitchen",
    rating: 4.9,
    reviews: 58,
    photo: {
      src: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Challah_board_-_August_2024_-_Sarah_Stierch.jpg/1280px-Challah_board_-_August_2024_-_Sarah_Stierch.jpg",
      alt: "A challah board of olive wood blocks laid like bricks, with Hebrew letters set into the middle, in raking sunlight.",
      ratio: 5712 / 4284,
      credit: "Sarah Stierch",
      license: "CC0",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      sourceUrl: `${COMMONS}File:Challah_board_-_August_2024_-_Sarah_Stierch.jpg`,
    },
  },
];

export function findListing(id: string): Listing {
  const listing = LISTINGS.find((item) => item.id === id);
  if (!listing) {
    throw new Error(`No listing "${id}"`);
  }
  return listing;
}

/* ---------------------------------------------------------------- the item */

export const ITEM = findListing("basket");

export const ITEM_DETAIL = {
  lead: "Coiled by hand from dried banana fiber and raffia, dyed in small batches and wound over a grass core. Each one takes about three days.",
  options: {
    label: "Size",
    choices: [
      { id: "s", label: "Small · 8 in", price: 3600 },
      { id: "m", label: "Medium · 11 in", price: 4800 },
      { id: "l", label: "Large · 14 in", price: 6400 },
    ],
    /** Index into `choices` that is selected to begin with. */
    initial: 1,
  },
  facts: [
    { label: "Materials", value: "Banana fiber, raffia, grass core" },
    { label: "Made in", value: "Kasese, Uganda" },
    { label: "Ships from", value: "Kampala · 5 to 9 days" },
    { label: "Returns", value: "Accepted within 30 days" },
  ],
  /** Extra photographs of the item, shown small beside the hero. */
  angles: [
    {
      src: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Hand_woven_basket_02.jpg/1280px-Hand_woven_basket_02.jpg",
      alt: "A smaller coiled basket nested inside a larger one, both seen from above.",
      ratio: 2387 / 2985,
      credit: "BalukuBrian",
      ...BY_SA_4,
      sourceUrl: `${COMMONS}File:Hand_woven_basket_02.jpg`,
    },
    {
      src: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Hand_woven_basket_03.jpg/1280px-Hand_woven_basket_03.jpg",
      alt: "A coiled basket with a chevron border, a plain coiled plate resting inside it.",
      ratio: 2221 / 2539,
      credit: "BalukuBrian",
      ...BY_SA_4,
      sourceUrl: `${COMMONS}File:Hand_woven_basket_03.jpg`,
    },
  ] satisfies Photo[],
} as const;

/* ---------------------------------------------------------------- the shop */

export const SHOP = {
  name: "Kasese Weavers",
  owner: "Brian Baluku",
  location: "Kasese, Uganda",
  since: "2019",
  sales: "4,182",
  rating: "4.9",
  reviewCount: "1,206",
  admirers: "9,340",
  lead: "A cooperative of eleven weavers working in the foothills of the Rwenzori. Every basket is coiled by one pair of hands, start to finish, from fiber cut within a day's walk of the workshop.",
  policies: [
    { label: "Responds", value: "Within a day" },
    { label: "Ships", value: "Worldwide, tracked" },
    { label: "Custom orders", value: "Yes, ask first" },
  ],
  photo: {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Hand_woven_basket_with_a_cover.jpg/1280px-Hand_woven_basket_with_a_cover.jpg",
    alt: "Lidded coiled baskets with pointed covers crowded on a workshop floor.",
    ratio: 1700 / 2575,
    position: "50% 60%",
    credit: "BalukuBrian",
    ...BY_SA_4,
    sourceUrl: `${COMMONS}File:Hand_woven_basket_with_a_cover.jpg`,
  } satisfies Photo,
  listings: [
    { id: "basket", title: "Coiled bowl, spiral weave", price: 4800 },
    {
      id: "nested",
      title: "Nesting bowls, set of three",
      price: 11000,
      photo: {
        src: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Hand_woven_basket_02.jpg/1280px-Hand_woven_basket_02.jpg",
        alt: "A smaller coiled basket nested inside a larger one, both seen from above.",
        ratio: 2387 / 2985,
        credit: "BalukuBrian",
        ...BY_SA_4,
        sourceUrl: `${COMMONS}File:Hand_woven_basket_02.jpg`,
      },
    },
    {
      id: "lidded",
      title: "Lidded basket, pointed cover",
      price: 7200,
      photo: {
        src: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Hand_woven_basket_with_a_cover.jpg/1280px-Hand_woven_basket_with_a_cover.jpg",
        alt: "A lidded coiled basket with a pointed cover, in front of many more.",
        ratio: 1700 / 2575,
        credit: "BalukuBrian",
        ...BY_SA_4,
        sourceUrl: `${COMMONS}File:Hand_woven_basket_with_a_cover.jpg`,
      },
    },
    {
      id: "beaded",
      title: "Beaded jar with flower lid",
      price: 8900,
      photo: {
        src: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Hand_woven_basket_06.jpg/1280px-Hand_woven_basket_06.jpg",
        alt: "A round jar covered entirely in small glass beads, its lid topped with a beaded flower.",
        ratio: 1581 / 2271,
        credit: "BalukuBrian",
        ...BY_SA_4,
        sourceUrl: `${COMMONS}File:Hand_woven_basket_06.jpg`,
      },
    },
  ],
  reviews: [
    {
      user: "EL",
      name: "Elena",
      date: "Aug 28 2026",
      stars: 5,
      text: "Tighter weave than the photos even show. It sits flat and the spiral is dead centered.",
      item: "Coiled bowl, spiral weave",
    },
    {
      user: "RM",
      name: "Rob",
      date: "Aug 14 2026",
      stars: 5,
      text: "Ordered the large as a fruit bowl. Arrived in nine days from Kampala, packed in banana leaves.",
      item: "Coiled bowl, spiral weave",
    },
    {
      user: "JW",
      name: "June",
      date: "Jul 30 2026",
      stars: 4,
      text: "The lid on the pointed basket fits well. Dye is a shade lighter than the listing.",
      item: "Lidded basket, pointed cover",
    },
  ],
} as const;

/* ---------------------------------------------------------------- the cart */

export type CartLine = {
  listing: Listing;
  quantity: number;
  /** The chosen option, shown under the title. */
  option?: string;
};

/** What is in the cart when the page loads. Adding the item puts it on top. */
export const CART_START: CartLine[] = [
  { listing: findListing("board"), quantity: 1 },
  { listing: findListing("soap"), quantity: 2 },
];

export const SHIPPING = 900;
/** Tax rate, applied to the subtotal. */
export const TAX = 0.0875;

export function dollars(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const TODAY = "Thu 04 Sep 2026";
