/*
 * The forecast, restructured.
 *
 * A weather site's front page keeps its four views (current conditions, the
 * next 24 hours, the week, radar) and every reading a person actually checks.
 * The numbers are a fixed snapshot rather than a live feed, so the server and
 * the browser always render the same page, and so the motion can be tuned
 * against known values. Three cities carry three different skies: fog, rain,
 * and sun, with a storm somewhere in each week.
 */

export type Condition = "sun" | "partly" | "cloud" | "fog" | "rain" | "storm";

export const CONDITION_LABEL: Record<Condition, string> = {
  sun: "Clear",
  partly: "Partly cloudy",
  cloud: "Overcast",
  fog: "Fog",
  rain: "Rain",
  storm: "Thunderstorm",
};

export type Hour = {
  /** 0–23, local time. */
  hour: number;
  temp: number;
  /** Chance of precipitation, 0–100. */
  precip: number;
  condition: Condition;
};

export type Day = {
  day: string;
  date: string;
  high: number;
  low: number;
  precip: number;
  condition: Condition;
};

/** A moving cell of precipitation on the radar, in grid units per frame. */
export type RadarBlob = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  strength: number;
};

export type City = {
  id: string;
  name: string;
  station: string;
  timezone: string;
  asOf: string;
  temp: number;
  condition: Condition;
  feelsLike: number;
  high: number;
  low: number;
  sunrise: string;
  sunset: string;
  /** How much of the day's light had passed as of `asOf`, 0–1. */
  sunProgress: number;
  wind: { speed: number; gust: number; direction: number; compass: string };
  humidity: number;
  dewPoint: number;
  pressure: string;
  visibility: string;
  uv: number;
  hourly: Hour[];
  week: Day[];
  radar: RadarBlob[];
};

const hours = (
  start: number,
  temps: number[],
  precip: number[],
  conditions: string,
): Hour[] => {
  const codes: Record<string, Condition> = {
    s: "sun",
    p: "partly",
    c: "cloud",
    f: "fog",
    r: "rain",
    t: "storm",
  };
  return temps.map((temp, i) => ({
    hour: (start + i) % 24,
    temp,
    precip: precip[i] ?? 0,
    condition: codes[conditions[i] ?? "c"] ?? "cloud",
  }));
};

export const CITIES: City[] = [
  {
    id: "sfo",
    name: "San Francisco, CA",
    station: "KMUX",
    timezone: "PDT",
    asOf: "09:12",
    temp: 61,
    condition: "fog",
    feelsLike: 58,
    high: 66,
    low: 54,
    sunrise: "06:47",
    sunset: "19:33",
    sunProgress: 0.19,
    wind: { speed: 14, gust: 22, direction: 270, compass: "W" },
    humidity: 88,
    dewPoint: 57,
    pressure: "30.02",
    visibility: "1.2",
    uv: 2,
    hourly: hours(
      9,
      [58, 59, 61, 63, 65, 66, 66, 65, 63, 61, 59, 58, 57, 57, 56, 56, 55, 55, 55, 54, 54, 55, 56, 58],
      [10, 10, 5, 5, 0, 0, 0, 0, 0, 5, 10, 10, 15, 15, 20, 20, 20, 20, 25, 25, 20, 15, 10, 10],
      "fffppssssppcffffffffffff",
    ),
    week: [
      { day: "Wed", date: "Sep 3", high: 66, low: 54, precip: 10, condition: "fog" },
      { day: "Thu", date: "Sep 4", high: 64, low: 53, precip: 10, condition: "fog" },
      { day: "Fri", date: "Sep 5", high: 68, low: 55, precip: 0, condition: "partly" },
      { day: "Sat", date: "Sep 6", high: 74, low: 57, precip: 0, condition: "sun" },
      { day: "Sun", date: "Sep 7", high: 79, low: 58, precip: 0, condition: "sun" },
      { day: "Mon", date: "Sep 8", high: 71, low: 56, precip: 20, condition: "partly" },
      { day: "Tue", date: "Sep 9", high: 63, low: 54, precip: 70, condition: "rain" },
    ],
    // A thin band of drizzle sliding in off the ocean.
    radar: [
      { x: 2, y: 9, dx: 1.6, dy: 0.2, radius: 2.4, strength: 0.55 },
      { x: 4, y: 15, dx: 1.5, dy: -0.1, radius: 2.8, strength: 0.45 },
      { x: 0, y: 12, dx: 1.7, dy: 0.1, radius: 1.8, strength: 0.4 },
    ],
  },
  {
    id: "sea",
    name: "Seattle, WA",
    station: "KATX",
    timezone: "PDT",
    asOf: "09:12",
    temp: 54,
    condition: "rain",
    feelsLike: 50,
    high: 58,
    low: 49,
    sunrise: "06:31",
    sunset: "19:41",
    sunProgress: 0.2,
    wind: { speed: 18, gust: 31, direction: 205, compass: "SSW" },
    humidity: 94,
    dewPoint: 52,
    pressure: "29.71",
    visibility: "3.5",
    uv: 1,
    hourly: hours(
      9,
      [52, 53, 54, 55, 56, 57, 58, 58, 57, 56, 55, 54, 53, 52, 52, 51, 51, 50, 50, 50, 49, 49, 50, 51],
      [80, 85, 90, 90, 85, 75, 60, 55, 60, 70, 80, 85, 90, 90, 85, 70, 60, 50, 45, 40, 40, 35, 35, 40],
      "rrrrrrccrrrrrrrrccccccrc",
    ),
    week: [
      { day: "Wed", date: "Sep 3", high: 58, low: 49, precip: 90, condition: "rain" },
      { day: "Thu", date: "Sep 4", high: 60, low: 50, precip: 80, condition: "rain" },
      { day: "Fri", date: "Sep 5", high: 62, low: 51, precip: 60, condition: "storm" },
      { day: "Sat", date: "Sep 6", high: 66, low: 52, precip: 20, condition: "cloud" },
      { day: "Sun", date: "Sep 7", high: 70, low: 53, precip: 0, condition: "partly" },
      { day: "Mon", date: "Sep 8", high: 72, low: 54, precip: 0, condition: "sun" },
      { day: "Tue", date: "Sep 9", high: 65, low: 52, precip: 40, condition: "rain" },
    ],
    // A front the width of the screen, moving through from the southwest.
    radar: [
      { x: 3, y: 4, dx: 1.4, dy: 0.9, radius: 4.5, strength: 0.9 },
      { x: 1, y: 11, dx: 1.5, dy: 0.7, radius: 5, strength: 1 },
      { x: 5, y: 18, dx: 1.3, dy: 0.5, radius: 4, strength: 0.8 },
      { x: 9, y: 8, dx: 1.4, dy: 0.8, radius: 2.5, strength: 0.6 },
    ],
  },
  {
    id: "phx",
    name: "Phoenix, AZ",
    station: "KIWA",
    timezone: "MST",
    asOf: "09:12",
    temp: 96,
    condition: "sun",
    feelsLike: 99,
    high: 108,
    low: 84,
    sunrise: "06:09",
    sunset: "18:47",
    sunProgress: 0.24,
    wind: { speed: 6, gust: 11, direction: 110, compass: "ESE" },
    humidity: 24,
    dewPoint: 55,
    pressure: "29.88",
    visibility: "10",
    uv: 11,
    hourly: hours(
      9,
      [96, 99, 102, 104, 106, 107, 108, 108, 107, 105, 102, 99, 96, 94, 92, 90, 89, 88, 87, 86, 85, 85, 84, 86],
      [0, 0, 0, 0, 0, 5, 10, 20, 35, 45, 40, 30, 20, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      "sssssspppttppsssssssssss",
    ),
    week: [
      { day: "Wed", date: "Sep 3", high: 108, low: 84, precip: 20, condition: "sun" },
      { day: "Thu", date: "Sep 4", high: 106, low: 83, precip: 40, condition: "storm" },
      { day: "Fri", date: "Sep 5", high: 103, low: 82, precip: 30, condition: "partly" },
      { day: "Sat", date: "Sep 6", high: 104, low: 81, precip: 10, condition: "sun" },
      { day: "Sun", date: "Sep 7", high: 105, low: 82, precip: 0, condition: "sun" },
      { day: "Mon", date: "Sep 8", high: 107, low: 84, precip: 0, condition: "sun" },
      { day: "Tue", date: "Sep 9", high: 104, low: 83, precip: 20, condition: "partly" },
    ],
    // One monsoon cell building over the mountains to the southeast.
    radar: [
      { x: 17, y: 16, dx: -0.6, dy: -0.5, radius: 1.6, strength: 0.5 },
      { x: 19, y: 18, dx: -0.7, dy: -0.6, radius: 2.4, strength: 0.9 },
    ],
  },
];

export const CHAPTERS = [
  { id: "now", number: "01", title: "Now" },
  { id: "hourly", number: "02", title: "Hourly" },
  { id: "week", number: "03", title: "Week" },
  { id: "radar", number: "04", title: "Radar" },
] as const;

/* ------------------------------------------------------------------ radar */

export const RADAR_GRID = 26;
export const RADAR_FRAMES = ["−60", "−45", "−30", "−15", "Now"] as const;

/** A tiny seeded generator, so the noise on the radar is the same on every render. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One intensity grid (0–1, row-major) per radar frame. Each cell of rain is a
 * soft disc that moves a little every frame, roughened with fixed noise; the
 * radar draws whatever is inside the outer ring.
 */
export function radarFrames(city: City): number[][] {
  const N = RADAR_GRID;
  const noise: number[] = [];
  const random = mulberry32(city.id.charCodeAt(0) * 7919 + city.id.charCodeAt(2));
  for (let i = 0; i < N * N; i++) {
    noise.push(random());
  }
  const frames: number[][] = [];
  const last = RADAR_FRAMES.length - 1;
  for (let f = 0; f <= last; f++) {
    const cells: number[] = [];
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        let v = 0;
        for (const blob of city.radar) {
          const bx = blob.x + blob.dx * f;
          const by = blob.y + blob.dy * f;
          const d2 = (x - bx) ** 2 + (y - by) ** 2;
          v += blob.strength * Math.exp(-d2 / (2 * blob.radius ** 2));
        }
        const n = noise[y * N + x] ?? 0.5;
        v = v * (0.7 + n * 0.6);
        cells.push(v < 0.18 ? 0 : Math.min(v, 1));
      }
    }
    frames.push(cells);
  }
  return frames;
}
