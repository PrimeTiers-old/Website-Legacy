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
export const REGION_COLORS = {
  NA: "#4aa3ff", // blue
  EU: "#b57bff", // violet
  SA: "#3ddc97", // green
  AS: "#ff5fa2", // pink
  AU: "#ffd166", // gold
  ME: "#ff8a4c", // orange
  AF: "#2ec4d6", // cyan
};

// Top-level pages. "discord" is an external link, not a page.
export const PAGES = [
  { id: "home", label: "Home", href: "#/" },
  { id: "leaderboard", label: "Leaderboard", href: "#/leaderboard" },
  { id: "ip", label: "Server IP", href: "#/ip" },
  { id: "events", label: "Events", href: "#/events" },
];
