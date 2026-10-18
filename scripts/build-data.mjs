// Build-time snapshot of premium or cracked status, written to public/data/heads.json.
// The site uses this only as a fallback: live `platform` values from the API win when present.
// Also used by npm run dev and npm run build.
//
// If the API is unreachable, the previous heads.json is kept and the build still succeeds.

import { mkdir, readFile, writeFile } from "node:fs/promises";

const dataSrc = await readFile(new URL("../src/data.js", import.meta.url), "utf8");
const API_BASE = dataSrc.match(/API_BASE\s*=\s*"([^"]+)"/)?.[1];
if (!API_BASE) throw new Error("Could not read API_BASE from src/data.js");

const OUT = new URL("../public/data/", import.meta.url);
await mkdir(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function readPrevious() {
  try {
    return JSON.parse(await readFile(new URL("heads.json", OUT), "utf8"));
  } catch {
    return {};
  }
}

// Premium or cracked, from the API's player record (platform: "premium" | "cracked").
async function lookupPlatform(name) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/api/players/${encodeURIComponent(name)}`);
      if (res.ok) {
        const { platform } = await res.json();
        if (platform === "premium" || platform === "cracked") return { premium: platform === "premium" };
        return null;
      }
      if (res.status === 404) return null;
      await sleep(1000 * (attempt + 1));
    } catch {
      await sleep(1000 * (attempt + 1));
    }
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
  const names = [...new Set(leaderboard.items.map((i) => i.username.toLowerCase()))];

  for (const name of names) {
    const result = await lookupPlatform(name);
    if (result) heads[name] = result;
    else {
      failed++;
      if (previous[name]) heads[name] = previous[name];
    }
    await sleep(100);
  }

  await writeFile(new URL("heads.json", OUT), JSON.stringify(heads));
  console.log(`heads: ${Object.keys(heads).length} resolved, ${failed} failed`);
}
