// Build-time snapshot of premium or cracked status, written to public/data/heads.json.
// The site uses this only as a fallback: live `platform` values from the API win when present.
// Also used by npm run dev and npm run build.
//
// Uses the batch endpoint (GET /api/players?names=...), up to 50 names per request.
//
// If the API is unreachable, the previous heads.json is kept and the build still succeeds.

import { mkdir, readFile, writeFile } from "node:fs/promises";

const dataSrc = await readFile(new URL("../src/data.js", import.meta.url), "utf8");
const API_BASE = dataSrc.match(/API_BASE\s*=\s*"([^"]+)"/)?.[1];
if (!API_BASE) throw new Error("Could not read API_BASE from src/data.js");

const OUT = new URL("../public/data/", import.meta.url);
await mkdir(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BATCH_SIZE = 50;

async function readPrevious() {
  try {
    return JSON.parse(await readFile(new URL("heads.json", OUT), "utf8"));
  } catch {
    return {};
  }
}

// One batch request, with a few retries. Returns the `items` array, or null on failure.
async function fetchBatch(names) {
  const url = `${API_BASE}/api/players?names=${names.map(encodeURIComponent).join(",")}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const { items } = await res.json();
        return Array.isArray(items) ? items : null;
      }
      if (res.status === 400) return null; // bad request, retrying won't help
    } catch {
      // network error, fall through to retry
    }
    await sleep(1000 * (attempt + 1));
  }
  return null;
}

const leaderboard = await fetch(`${API_BASE}/api/leaderboard/global?limit=500`)
  .then((r) => (r.ok ? r.json() : null))
  .catch(() => null);

if (!leaderboard) {
  console.warn("heads: API unavailable, kept previous heads.json");
} else {
  const previous = await readPrevious();
  const heads = {};
  let failed = 0;
  // The batch endpoint rejects the whole request if any name has characters outside
  // [A-Za-z0-9_.], so skip those names instead of letting them fail 50 players at once.
  const allNames = [...new Set(leaderboard.items.map((i) => i.username.toLowerCase()))];
  const names = allNames.filter((n) => /^[a-z0-9_.]{1,32}$/.test(n));
  const skipped = allNames.length - names.length;
  if (skipped) console.warn(`heads: ${skipped} names not valid for lookup, kept previous values`);

  for (let i = 0; i < names.length; i += BATCH_SIZE) {
    const batch = names.slice(i, i + BATCH_SIZE);
    const items = await fetchBatch(batch);
    const found = new Map((items ?? []).map((p) => [p.username.toLowerCase(), p.platform]));

    for (const name of batch) {
      const platform = found.get(name);
      if (platform === "premium" || platform === "cracked") {
        heads[name] = { premium: platform === "premium" };
      } else {
        failed++;
        if (previous[name]) heads[name] = previous[name];
      }
    }
  }
  for (const name of allNames) {
    if (!names.includes(name)) {
      failed++;
      if (previous[name]) heads[name] = previous[name];
    }
  }

  await writeFile(new URL("heads.json", OUT), JSON.stringify(heads));
  console.log(`heads: ${Object.keys(heads).length} resolved, ${failed} failed`);
}
