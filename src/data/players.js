// Live leaderboard from the PrimeTiers API. One request per visit, cached 5 minutes by the API's edge.
//
// PLAYERS is filled by loadPlayers(). Each record:
//   name    Minecraft username
//   region  one of REGIONS in data.js
//   tiers   gamemode slug (from GAMEMODES in data.js) -> tier (HT1..LT5)

import { API_BASE } from "../data.js";
import { setKnownAccounts } from "../ui/heads.js";

export const PLAYERS = [];

const TIMEOUT_MS = 10000;
const ATTEMPTS = 3;
let inFlight = null;

// One attempt: a timeout so a stalled mobile connection can't hang forever.
async function fetchItems() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/api/leaderboard/global?limit=500`, {
      signal: controller.signal,
      cache: "no-cache",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    if (!body || !Array.isArray(body.items)) throw new Error("Unexpected response shape");
    return body.items;
  } finally {
    clearTimeout(timer);
  }
}

function apply(items) {
  // If the API sends `platform` ("premium" | "cracked") per item, account type is live too.
  setKnownAccounts(
    items
      .filter((i) => i.platform === "premium" || i.platform === "cracked")
      .map((i) => [i.username, { premium: i.platform === "premium" }])
  );

  const players = items
    .filter((item) => item && typeof item.username === "string" && Array.isArray(item.tiers))
    .map((item) => ({
      name: item.username,
      region: item.region,
      tiers: Object.fromEntries(item.tiers.map((t) => [t.gamemode, t.tier])),
    }));
  PLAYERS.splice(0, PLAYERS.length, ...players);
}

// Resolves to true when loaded. Retries with a short backoff on network errors,
// timeouts, and bad responses. Concurrent calls share one request.
export function loadPlayers() {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      try {
        apply(await fetchItems());
        return true;
      } catch (err) {
        console.warn(`Leaderboard attempt ${attempt} failed:`, err);
        if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
    console.error("Could not load leaderboard.");
    return false;
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
