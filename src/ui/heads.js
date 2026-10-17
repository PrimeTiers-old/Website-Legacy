// Player heads and account type (Premium or Cracked).
//
// Flow per username:
//   1. localStorage (7 days). Repeat visits make no network calls.
//   2. /api/uuid/<name>. A Pages Function when deployed, and a Vite middleware in local dev
//      (see vite.config.js). Both cache the answer.
//   3. Premium: the real head from mc-heads.net, keyed by UUID. Labelled "Premium".
//      Cracked: a monogram with a dashed frame, labelled "Cracked".
//      If the lookup itself fails: monogram, labelled "Unavailable", and not cached.
//
// Any element with data-head="<name>" gets the head. Any element with data-acct="<name>"
// gets the account label. Concurrent lookups for the same name share one request.

const STORAGE_KEY = "pt-heads-v1";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const HEAD_URL = (uuid) => `https://mc-heads.net/avatar/${uuid}/64`;
const UNAVAILABLE = { unavailable: true };

const inflight = new Map();
let store = null;

function readStore() {
  if (store) return store;
  try {
    store = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    store = {};
  }
  return store;
}

function writeStore() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage full or disabled. Lookups still work, just without the local cache.
  }
}

function fromCache(key) {
  const entry = readStore()[key];
  if (!entry || Date.now() - entry.at > TTL_MS) return null;
  return entry.value;
}

async function fetchAccount(name) {
  const res = await fetch(`/api/uuid/${encodeURIComponent(name)}`, {
    headers: { Accept: "application/json" },
  });
  const type = res.headers.get("content-type") ?? "";
  // Anything that isn't our JSON (missing function, HTML fallback, rate limit) is a failed lookup.
  if (!res.ok || !type.includes("application/json")) return UNAVAILABLE;
  const data = await res.json();
  if (typeof data.premium !== "boolean") return UNAVAILABLE;
  return data.premium ? { premium: true, uuid: data.uuid } : { premium: false };
}

async function lookup(name) {
  const key = name.toLowerCase();
  if (inflight.has(key)) return inflight.get(key);

  const promise = (async () => {
    const cached = fromCache(key);
    if (cached) return cached;

    try {
      const value = await fetchAccount(name);
      if (value !== UNAVAILABLE) {
        readStore()[key] = { at: Date.now(), value };
        writeStore();
      }
      return value;
    } catch {
      return UNAVAILABLE;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

const esc = (s) => CSS.escape(s);

function labelAccounts(name, text, cls, root) {
  root.querySelectorAll(`[data-acct="${esc(name)}"]`).forEach((el) => {
    el.classList.remove("acct-checking", "acct-premium", "acct-cracked", "acct-unavailable");
    el.classList.add(cls);
    el.textContent = text;
  });
}

// Fills every head and account label inside `root`.
export function hydrateHeads(root = document) {
  const names = new Set(
    [...root.querySelectorAll("[data-head]:not([data-head-done]), [data-acct]:not([data-acct-done])")].map(
      (el) => el.dataset.head ?? el.dataset.acct
    )
  );

  names.forEach(async (name) => {
    root.querySelectorAll(`[data-head="${esc(name)}"], [data-acct="${esc(name)}"]`).forEach((el) => {
      el.setAttribute("data-head-done", "");
      el.setAttribute("data-acct-done", "");
    });

    const result = await lookup(name);

    if (result === UNAVAILABLE) {
      labelAccounts(name, "Unavailable", "acct-unavailable", root);
      return;
    }

    if (!result.premium) {
      labelAccounts(name, "Cracked", "acct-cracked", root);
      root.querySelectorAll(`[data-head="${esc(name)}"]`).forEach((slot) => slot.classList.add("is-cracked"));
      return;
    }

    labelAccounts(name, "Premium", "acct-premium", root);
    root.querySelectorAll(`[data-head="${esc(name)}"]`).forEach((slot) => {
      const img = new Image(34, 34);
      img.alt = "";
      img.decoding = "async";
      img.width = 34;
      img.height = 34;
      img.onload = () => {
        slot.classList.add("has-head");
        slot.replaceChildren(img);
      };
      img.src = HEAD_URL(result.uuid);
    });
  });
}
