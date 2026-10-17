// Cloudflare Pages Function: GET /api/uuid/<name>
//
// Looks up whether a Minecraft username is a premium (Mojang) account and returns its UUID.
// Response: { name, premium: true, uuid } or { name, premium: false }
//
// Caching, so Mojang and our site are never hit per visitor:
//   1. Edge cache (caches.default) keeps each name for 7 days per Cloudflare data centre.
//   2. Cache-Control on the response lets browsers and CDNs keep it for 7 days.
//   3. The browser also keeps results in localStorage (see src/ui/heads.js).
// There is no database. Nothing here is written anywhere.

const NAME_PATTERN = /^[A-Za-z0-9_]{3,16}$/;
const TTL_SECONDS = 60 * 60 * 24 * 7;
const NEGATIVE_TTL_SECONDS = 60 * 60 * 24; // cracked/not-found: re-check once a day

export async function onRequestGet({ params, request, waitUntil }) {
  const name = String(params.name ?? "");
  if (!NAME_PATTERN.test(name)) {
    return json({ error: "Invalid username" }, 400, 0);
  }

  const cacheKey = new Request(new URL(`/__uuid/${name.toLowerCase()}`, request.url).toString());
  const cache = caches.default;

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let body;
  let ttl = TTL_SECONDS;
  try {
    // Mojang returns 200 with the profile for premium names, and 204/404 otherwise.
    const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(name)}`, {
      headers: { Accept: "application/json" },
    });

    if (res.status === 200) {
      const profile = await res.json();
      body = { name: profile.name, premium: true, uuid: profile.id };
    } else if (res.status === 204 || res.status === 404) {
      body = { name, premium: false };
      ttl = NEGATIVE_TTL_SECONDS;
    } else {
      // Rate limited or Mojang error: don't cache, let the client fall back to a monogram.
      return json({ name, premium: null, error: "Lookup unavailable" }, 503, 60);
    }
  } catch {
    return json({ name, premium: null, error: "Lookup unavailable" }, 503, 60);
  }

  const response = json(body, 200, ttl);
  waitUntil(cache.put(cacheKey, response.clone()));
  return response;
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
