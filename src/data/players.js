// Live leaderboard data from the PrimeTiers API (Cloudflare Worker, see API repo).
//
// PLAYERS is filled by loadPlayers(). Each record:
//   name    Minecraft username
//   region  one of REGIONS in data.js
//   tiers   gamemode slug (from GAMEMODES in data.js) -> tier (HT1..LT5)
//
// Gamemode slugs match the API: nethertite and mace-spear.

import { API_BASE } from "../data.js";

export const PLAYERS = [];

// The leaderboard is cached in this browser for 5 minutes. Visitors share the
// API's edge cache too, so Supabase sees roughly one request per region per 5 minutes.
const CACHE_KEY = "pt:leaderboard:v1";
const CACHE_MS = 5 * 60 * 1000;

function readCache() {
  try {
    const hit = JSON.parse(localStorage.getItem(CACHE_KEY));
    return hit && Date.now() - hit.at < CACHE_MS ? hit.items : null;
  } catch {
    return null;
  }
}

function writeCache(items) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), items }));
  } catch {
    // Storage full or blocked. The page still works without the cache.
  }
}

// Loads every ranked player in one request. Resolves to true when loaded.
export async function loadPlayers() {
  try {
    let items = readCache();
    if (!items) {
      const res = await fetch(`${API_BASE}/api/leaderboard/global?limit=500`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      items = (await res.json()).items;
      writeCache(items);
    }
    const players = items.map((item) => ({
      name: item.username,
      region: item.region,
      tiers: Object.fromEntries(item.tiers.map((t) => [t.gamemode, t.tier])),
    }));
    PLAYERS.splice(0, PLAYERS.length, ...players);
    return true;
  } catch (err) {
    console.error("Could not load leaderboard:", err);
    return false;
  }
}
