// Player heads and account type (Premium or Cracked).
//
// Static: the account type comes from public/data/heads.json, written at build time
// by scripts/build-data.mjs. No API calls happen in the visitor's browser.
//
// Every head starts as a default skin, Steve or Alex, chosen from the name so it stays the same.
// Premium players then get their real head from mc-heads.net, by username.
// Cracked and unknown players keep the default skin.
//
// Any element with data-head="<name>" gets the head. Any element with data-acct="<name>"
// gets the account label.

const HEAD_URL = (name) => `https://mc-heads.net/avatar/${encodeURIComponent(name)}/64`;

// Steve or Alex, picked from the name so the same player always gets the same default.
export function defaultSkin(name) {
  const sum = [...name.toLowerCase()].reduce((total, ch) => total + ch.charCodeAt(0), 0);
  return sum % 2 === 0 ? "/images/heads/steve.svg" : "/images/heads/alex.svg";
}

// Live account types from the API (when it sends `platform`). These win over the build snapshot.
const known = new Map();
export function setKnownAccounts(entries) {
  entries.forEach(([name, value]) => known.set(name.toLowerCase(), value));
}

let accounts = null;
let loading = null;

// Loads the static file once. Resolves to {} if it is missing, so every player shows "Unavailable".
function loadAccounts() {
  if (!loading) {
    loading = fetch("/data/heads.json")
      .then((res) => (res.ok ? res.json() : {}))
      .catch(() => ({}))
      .then((data) => (accounts = data));
  }
  return loading;
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

  names.forEach((name) => {
    root.querySelectorAll(`[data-head="${esc(name)}"], [data-acct="${esc(name)}"]`).forEach((el) => {
      el.setAttribute("data-head-done", "");
      el.setAttribute("data-acct-done", "");
    });

    loadAccounts().then(() => {
      const key = name.toLowerCase();
      const entry = known.get(key) ?? accounts[key];

      if (!entry) {
        labelAccounts(name, "Unavailable", "acct-unavailable", root);
        return;
      }

      if (!entry.premium) {
        labelAccounts(name, "Cracked", "acct-cracked", root);
        return;
      }

      labelAccounts(name, "Premium", "acct-premium", root);
      root.querySelectorAll(`[data-head="${esc(name)}"]`).forEach((slot) => {
        const img = new Image(56, 56);
        img.alt = "";
        img.decoding = "async";
        img.width = 56;
        img.height = 56;
        img.onload = () => {
          slot.classList.add("has-head");
          slot.replaceChildren(img);
        };
        img.src = HEAD_URL(name);
      });
    });
  });
}
