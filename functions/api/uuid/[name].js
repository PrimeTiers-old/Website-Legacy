// Player lookup: GET /api/uuid/<name>  (used by the Worker in worker/index.js)
//
// Returns: { name, premium: true, uuid } or { name, premium: false } or { name, premium: null }
//
// Sources, in order:
//   1. Mojang's profile API (authoritative: 200 = premium, 204/404 = cracked).
//   2. PlayerDB, if Mojang fails or rate-limits the request (Cloudflare's shared network is often limited).
//
// Caching, so no lookup is repeated per visitor:
//   - Edge cache (caches.default) keeps each name for 7 days (1 day for cracked names).
//   - Cache-Control on the response lets browsers and CDNs keep it too.
//   - The browser keeps results in localStorage (see src/ui/heads.js).
// There is no database. Nothing is written anywhere.

const NAME_PATTERN = /^[A-Za-z0-9_]{3,16}$/;
const TTL_SECONDS = 60 * 60 * 24 * 7;
const NEGATIVE_TTL_SECONDS = 60 * 60 * 24;
const UNAVAILABLE_TTL_SECONDS = 60;

export async function onRequestGet({ params, request, waitUntil }) {
  const name = String(params.name ?? "");
  if (!NAME_PATTERN.test(name)) {
    return json({ error: "Invalid username" }, 400, 0);
  }

  const cacheKey = new Request(new URL(`/__uuid/${name.toLowerCase()}`, request.url).toString());
  const cache = caches.default;

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const result = (await lookupMojang(name)) ?? (await lookupPlayerDb(name));

  let response;
  if (result.premium === null) {
    response = json({ name, premium: null, error: "Lookup unavailable" }, 503, UNAVAILABLE_TTL_SECONDS);
  } else {
    const ttl = result.premium ? TTL_SECONDS : NEGATIVE_TTL_SECONDS;
    response = json(result, 200, ttl);
    waitUntil(cache.put(cacheKey, response.clone()));
  }
  return response;
}

// Returns { premium, uuid?, name } when Mojang answers definitively, or null when it fails.
async function lookupMojang(name) {
  try {
    const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(name)}`, {
      headers: { Accept: "application/json" },
    });
    if (res.status === 200) {
      const profile = await res.json();
      return { name: profile.name, premium: true, uuid: profile.id };
    }
    if (res.status === 204 || res.status === 404) return { name, premium: false };
    return null;
  } catch {
    return null;
  }
}

// Returns { premium, uuid?, name } when PlayerDB answers definitively, or { premium: null } when it fails.
async function lookupPlayerDb(name) {
  try {
    const res = await fetch(`https://playerdb.co/api/player/minecraft/${encodeURIComponent(name)}`, {
      headers: { Accept: "application/json", "User-Agent": "PrimeTiers/1.0" },
    });
    const data = await res.json().catch(() => null);
    if (res.status === 200 && data?.success) {
      const player = data.data.player;
      return { name: player.username, premium: true, uuid: player.raw_id };
    }
    if (res.status === 400 && data?.code === "minecraft.invalid_username") return { name, premium: false };
    return { name, premium: null };
  } catch {
    return { name, premium: null };
  }
}

function json(data, status, maxAge) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge}`,
      "Access-Control-Allow-Origin": "*",
    },
  });
}
