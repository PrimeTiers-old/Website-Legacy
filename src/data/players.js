// Live leaderboard from the PrimeTiers API. One request per visit, cached 5 minutes by the API's edge.
//
// PLAYERS is filled by loadPlayers(). Each record:
//   name    Minecraft username
//   region  one of REGIONS in data.js
//   tiers   gamemode slug (from GAMEMODES in data.js) -> tier (HT1..LT5)

import { API_BASE } from "../data.js";
import { setKnownAccounts } from "../ui/heads.js";

export const PLAYERS = [];

// Resolves to true when loaded.
export async function loadPlayers() {
  try {
    const res = await fetch(`${API_BASE}/api/leaderboard/global?limit=500`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { items } = await res.json();

    // If the API sends `platform` ("premium" | "cracked") per item, account type is live too.
    setKnownAccounts(
      items
        .filter((i) => i.platform === "premium" || i.platform === "cracked")
        .map((i) => [i.username, { premium: i.platform === "premium" }])
    );

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
