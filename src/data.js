// Single source of truth for gamemodes, tiers, and regions.
// Edit here, the page renders from these lists.

export const DISCORD_URL = "https://discord.gg/primetiers";
export const SERVER_IP = "Primetiers.net";
export const GUILD_ID = "1498238605179748413";

// Gamemodes supported by PrimeTiers.
export const GAMEMODES = [
  { slug: "crystal", name: "Crystal" },
  { slug: "axe", name: "Axe" },
  { slug: "sword", name: "Sword" },
  { slug: "mace", name: "Mace" },
  { slug: "nethertite", name: "Nethertite" },
  { slug: "pot", name: "Pot" },
  { slug: "smp", name: "SMP" },
  { slug: "uhc", name: "UHC" },
  { slug: "cart", name: "Cart" },
  { slug: "mace-spear", name: "Mace Spear" },
];

// Tier ladder, top row first. Each level pairs a high and a low tier.
export const TIER_LEVELS = [
  { level: 1, ht: "HT1", lt: "LT1" },
  { level: 2, ht: "HT2", lt: "LT2" },
  { level: 3, ht: "HT3", lt: "LT3" },
  { level: 4, ht: "HT4", lt: "LT4" },
  { level: 5, ht: "HT5", lt: "LT5" },
];

// Flat order from best to worst, used for sorting and the tier filter.
export const TIER_ORDER = TIER_LEVELS.flatMap((row) => [row.ht, row.lt]);

// One distinct colour per tier. Shown on badges, chips, and the ladder.
export const TIER_COLORS = {
  HT1: "#ff5fa2", // rose
  LT1: "#ff8a4c", // orange
  HT2: "#ffd166", // gold
  LT2: "#9be564", // lime
  HT3: "#3ddc97", // emerald
  LT3: "#2ec4d6", // cyan
  HT4: "#4aa3ff", // blue
  LT4: "#7b6cff", // indigo
  HT5: "#b57bff", // violet
  LT5: "#9aa3b2", // slate
};

export const REGIONS = ["NA", "EU", "SA", "AS", "AU", "ME", "AF"];

// Staff and player roles shown on the leaderboard, highest first.
export const ROLES = ["Owner", "Admin", "Senior Tester", "Tester", "Member"];

// One colour per region. Drives the region tag, its dot, and its glint on the leaderboard.
// Each region uses the flag of one representative nation: REGION_COLORS is the main colour,
// REGION_ACCENTS the second colour (used for the glint). Brightened slightly for the dark theme.
export const REGION_COLORS = {
  NA: "#e0313f", // USA red
  EU: "#3d6dff", // EU flag blue
  SA: "#16b35a", // Brazil green
  AS: "#ff3b3b", // China red
  AU: "#2f63e0", // Australia blue
  ME: "#12a86b", // UAE green
  AF: "#19a64a", // Kenya green
};

export const REGION_ACCENTS = {
  NA: "#4f7dff", // USA blue
  EU: "#ffd23f", // EU flag gold
  SA: "#ffe033", // Brazil yellow
  AS: "#ffd23f", // China gold
  AU: "#ff4d5e", // Australia red
  ME: "#ff4a4a", // UAE red
  AF: "#ff4a4a", // Kenya red
};

// Top-level pages. "discord" is an external link, not a page.
export const PAGES = [
  { id: "home", label: "Home", href: "#/" },
  { id: "leaderboard", label: "Leaderboard", href: "#/leaderboard" },
  { id: "events", label: "Events", href: "#/events" },
];
