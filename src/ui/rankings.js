import { GAMEMODES, REGIONS, REGION_ACCENTS, REGION_COLORS, TIER_COLORS, TIER_ORDER } from "../data.js";
import { PLAYERS, loadPlayers } from "../data/players.js";
import { defaultSkin, hydrateHeads } from "./heads.js";
import { createSelect } from "./select.js";

// Filter state. "all" means no filter on that control.
const state = {
  mode: "all",
  region: "all",
  tier: "all",
  query: "",
};

const mode = (slug) => GAMEMODES.find((m) => m.slug === slug);
const modeIcon = (slug) => `/images/modes/${slug}.png`;
const rank = (tier) => TIER_ORDER.indexOf(tier);
const color = (tier) => TIER_COLORS[tier] ?? "#9aa3b2";

export function setupRankings() {
  const root = document.getElementById("rankings-filters");
  if (!root) return;

  root.innerHTML = `
    <div class="mode-slider" id="mode-slider">
      <button type="button" class="slider-btn" data-slide="-1" aria-label="Scroll gamemodes left">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m12.5 5-5 5 5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="pill-row" role="group" aria-label="Gamemode">
        ${pill("all", "All", null)}
        ${GAMEMODES.map((m) => pill(m.slug, m.name, modeIcon(m.slug))).join("")}
      </div>
      <button type="button" class="slider-btn" data-slide="1" aria-label="Scroll gamemodes right">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7.5 5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>
    <div class="filter-row">
      <div class="filter-slot" id="filter-region"></div>
      <div class="filter-slot" id="filter-tier"></div>
      <label class="search-wrap">
        <span class="visually-hidden">Search player</span>
        <input id="filter-query" type="search" placeholder="Search player" autocomplete="off" />
      </label>
    </div>`;

  document.getElementById("filter-region").append(
    createSelect({
      label: "Region",
      value: "all",
      options: [
        { value: "all", label: "All regions" },
        ...REGIONS.map((r) => ({ value: r, label: r, color: REGION_COLORS[r], accent: REGION_ACCENTS[r], pill: true })),
      ],
      onChange: (v) => {
        state.region = v;
        renderTable();
      },
    })
  );

  document.getElementById("filter-tier").append(
    createSelect({
      label: "Tier",
      value: "all",
      options: [
        { value: "all", label: "All tiers" },
        ...TIER_ORDER.map((t) => ({ value: t, label: t, color: TIER_COLORS[t], pill: true })),
      ],
      onChange: (v) => {
        state.tier = v;
        renderTable();
      },
    })
  );

  root.addEventListener("click", (e) => {
    const slide = e.target.closest("[data-slide]");
    if (slide) {
      const track = root.querySelector(".pill-row");
      track.scrollBy({ left: Number(slide.dataset.slide) * track.clientWidth * 0.7, behavior: "smooth" });
      return;
    }
    const btn = e.target.closest("[data-mode-filter]");
    if (!btn) return;
    state.mode = btn.dataset.modeFilter;
    root.querySelectorAll("[data-mode-filter]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b === btn));
    });
    renderTable();
  });

  const input = document.getElementById("filter-query");
  input.addEventListener("input", (e) => {
    state.query = e.target.value.trim().toLowerCase();
    renderTable();
  });

  // Opening the leaderboard always starts the gamemode row at the far left.
  window.addEventListener("hashchange", () => {
    if (!window.location.hash.startsWith("#/leaderboard")) return;
    setTimeout(() => {
      const track = root.querySelector(".pill-row");
      track.scrollTo({ left: 0, behavior: "instant" });
      syncSlider();
    }, 0);
  });

  // If the first load failed (e.g. flaky mobile connection), retry when the leaderboard is opened
  // or the tab becomes visible again, instead of leaving the table empty until a reload.
  const retryIfEmpty = () => {
    if (PLAYERS.length > 0) return;
    loadPlayers().then((ok) => {
      if (ok) renderTable();
    });
  };
  window.addEventListener("hashchange", () => {
    if (window.location.hash.startsWith("#/leaderboard")) retryIfEmpty();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") retryIfEmpty();
  });

  window.addEventListener("resize", syncSlider);
  const track = root.querySelector(".pill-row");
  track.addEventListener("scroll", syncSlider, { passive: true });
  // The leaderboard starts hidden, so the row measures 0 wide when first rendered.
  // Re-check whenever it gets a real size (e.g. when the page is shown).
  if ("ResizeObserver" in window) new ResizeObserver(syncSlider).observe(track);

  // Keeps the leaderboard search in sync with the header search (#/leaderboard?q=name).
  window.addEventListener("pt:search", (e) => {
    state.query = e.detail.trim().toLowerCase();
    input.value = e.detail;
    renderTable();
  });

  renderTable();
  // Fill the table once the API data arrives.
  loadPlayers().then((ok) => {
    if (ok) renderTable();
  });
}

const GRID_ICON = `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="3" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="11" y="3" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="3" y="11" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="11" y="11" width="6" height="6" rx="1.5" fill="currentColor"/></svg>`;

function pill(value, label, icon) {
  const pressed = value === state.mode;
  const img = icon ? `<img src="${icon}" alt="" width="18" height="18" />` : GRID_ICON;
  const kind = icon ? "" : " pill-all";
  return `<button type="button" class="pill${kind}" data-mode-filter="${value}" aria-pressed="${pressed}">${img}<span>${label}</span></button>`;
}


// The tiers a player has that match the current filters, best first.
function visibleTiers(player) {
  return Object.entries(player.tiers)
    .filter(([slug, tier]) => {
      if (state.mode !== "all" && slug !== state.mode) return false;
      if (state.tier !== "all" && tier !== state.tier) return false;
      return true;
    })
    .sort((a, b) => rank(a[1]) - rank(b[1]));
}

function filteredPlayers() {
  return PLAYERS.map((player) => ({ player, tiers: visibleTiers(player) }))
    .filter(({ player, tiers }) => {
      if (tiers.length === 0) return false;
      if (state.region !== "all" && player.region !== state.region) return false;
      if (state.query && !player.name.toLowerCase().includes(state.query)) return false;
      return true;
    })
    .sort((a, b) => {
      // All gamemodes: the API's total points decide the order, same as the global leaderboard.
      // A single gamemode: order by that gamemode's best tier.
      if (state.mode === "all") {
        return (
          b.player.points - a.player.points ||
          a.player.name.toLowerCase().localeCompare(b.player.name.toLowerCase())
        );
      }
      return (
        rank(a.tiers[0][1]) - rank(b.tiers[0][1]) || a.player.name.localeCompare(b.player.name)
      );
    });
}

function renderTable() {
  const body = document.getElementById("rankings-body");
  const count = document.getElementById("rankings-count");
  const head = document.getElementById("tiers-head");
  if (!body) return;

  head.textContent = state.mode === "all" ? "Tiers" : `${mode(state.mode).name} tier`;

  const rows = filteredPlayers();
  count.textContent = `${rows.length} ${rows.length === 1 ? "player" : "players"}`;

  if (rows.length === 0) {
    body.innerHTML = `
      <tr><td colspan="4" class="empty">No players match these filters. Try another gamemode or clear the search.</td></tr>`;
    return;
  }

  body.innerHTML = rows
    .map(
      ({ player, tiers }, i) => `
      <tr class="${i < 3 ? `rank-${i + 1}` : ""}" style="--i:${Math.min(i, 20)}">
        <td class="col-rank">${i + 1}</td>
        <td class="col-player">
          <span class="player">
            <span class="head" data-head="${escapeHtml(player.name)}">
              <img src="${defaultSkin(player.name)}" alt="" width="56" height="56" />
            </span>
            <span class="player-meta">
              <span class="player-name">${escapeHtml(player.name)}</span>
              <span class="acct acct-checking" data-acct="${escapeHtml(player.name)}">Checking</span>
            </span>
          </span>
        </td>
        <td class="col-region"><span class="region" style="--c:${REGION_COLORS[player.region] ?? "#9aa3b2"};--c2:${REGION_ACCENTS[player.region] ?? "#ffffff"}">${player.region}</span></td>
        <td class="col-tiers">
          <ul class="tier-chips">
            ${tiers.map(([slug, tier]) => tierChip(slug, tier)).join("")}
          </ul>
        </td>
      </tr>`
    )
    .join("");

  hydrateHeads(body);
  syncSlider();
}

function tierChip(slug, tier) {
  const name = mode(slug)?.name ?? slug;
  return `
    <li class="tier-chip" style="--c:${color(tier)}">
      <img src="${modeIcon(slug)}" alt="" width="22" height="22" loading="lazy" />
      <span class="chip-mode">${name}</span>
      <span class="chip-tier">${tier}</span>
    </li>`;
}

// Shows the arrows and edge fades only when the gamemode row overflows.
function syncSlider() {
  const slider = document.getElementById("mode-slider");
  const track = slider?.querySelector(".pill-row");
  if (!track) return;
  const max = track.scrollWidth - track.clientWidth;
  const overflow = max > 2;
  slider.classList.toggle("is-overflow", overflow);
  slider.classList.toggle("at-start", track.scrollLeft <= 2);
  slider.classList.toggle("at-end", track.scrollLeft >= max - 2);
  slider.querySelector('[data-slide="-1"]').disabled = track.scrollLeft <= 2;
  slider.querySelector('[data-slide="1"]').disabled = track.scrollLeft >= max - 2;
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
