import { GAMEMODES, REGIONS, REGION_COLORS, TIER_COLORS, TIER_ORDER } from "../data.js";
import { PLAYERS } from "../data/players.js";
import { hydrateHeads } from "./heads.js";

// Filter state. "all" means no filter on that control.
const state = {
  mode: "all",
  region: "all",
  tier: "all",
  query: "",
};

const mode = (slug) => GAMEMODES.find((m) => m.slug === slug);
const modeIcon = (slug) => `/images/modes/${slug}.svg`;
const rank = (tier) => TIER_ORDER.indexOf(tier);
const color = (tier) => TIER_COLORS[tier] ?? "#9aa3b2";
const roleSlug = (role) => role.toLowerCase().replace(/\s+/g, "-");

export function setupRankings() {
  const root = document.getElementById("rankings-filters");
  if (!root) return;

  root.innerHTML = `
    <div class="pill-row" role="group" aria-label="Gamemode">
      ${pill("all", "All modes", null)}
      ${GAMEMODES.map((m) => pill(m.slug, m.name, modeIcon(m.slug))).join("")}
    </div>
    <div class="filter-row">
      <label class="select-wrap">
        <span class="visually-hidden">Region</span>
        <select id="filter-region">
          <option value="all">All regions</option>
          ${REGIONS.map((r) => `<option value="${r}">${r}</option>`).join("")}
        </select>
      </label>
      <label class="select-wrap">
        <span class="visually-hidden">Tier</span>
        <select id="filter-tier">
          <option value="all">All tiers</option>
          ${TIER_ORDER.map((t) => `<option value="${t}">${t}</option>`).join("")}
        </select>
      </label>
      <label class="search-wrap">
        <span class="visually-hidden">Search player</span>
        <input id="filter-query" type="search" placeholder="Search player" autocomplete="off" />
      </label>
    </div>`;

  root.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-mode-filter]");
    if (!btn) return;
    state.mode = btn.dataset.modeFilter;
    root.querySelectorAll("[data-mode-filter]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b === btn));
    });
    renderTable();
  });

  document.getElementById("filter-region").addEventListener("change", (e) => {
    state.region = e.target.value;
    renderTable();
  });
  document.getElementById("filter-tier").addEventListener("change", (e) => {
    state.tier = e.target.value;
    renderTable();
  });
  const input = document.getElementById("filter-query");
  input.addEventListener("input", (e) => {
    state.query = e.target.value.trim().toLowerCase();
    renderTable();
  });

  // Keeps the leaderboard search in sync with the header search (#/leaderboard?q=name).
  window.addEventListener("pt:search", (e) => {
    state.query = e.detail.trim().toLowerCase();
    input.value = e.detail;
    renderTable();
  });

  renderTable();
}

function pill(value, label, icon) {
  const pressed = value === state.mode;
  const img = icon ? `<img src="${icon}" alt="" width="18" height="18" />` : "";
  return `<button type="button" class="pill" data-mode-filter="${value}" aria-pressed="${pressed}">${img}<span>${label}</span></button>`;
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
    .sort(
      (a, b) =>
        rank(a.tiers[0][1]) - rank(b.tiers[0][1]) || a.player.name.localeCompare(b.player.name)
    );
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
      <tr><td colspan="5" class="empty">No players match these filters. Try another gamemode or clear the search.</td></tr>`;
    return;
  }

  body.innerHTML = rows
    .map(
      ({ player, tiers }, i) => `
      <tr class="${i < 3 ? `rank-${i + 1}` : ""}" style="--i:${Math.min(i, 20)}">
        <td class="col-rank">${i + 1}</td>
        <td class="col-player">
          <span class="player">
            <span class="head" data-head="${escapeHtml(player.name)}" aria-hidden="true">${player.name.slice(0, 2).toUpperCase()}</span>
            <span class="player-meta">
              <span class="player-name">${escapeHtml(player.name)}</span>
              <span class="acct acct-checking" data-acct="${escapeHtml(player.name)}">Checking</span>
            </span>
          </span>
        </td>
        <td class="col-role"><span class="role role-${roleSlug(player.role)}">${player.role}</span></td>
        <td class="col-region"><span class="region" style="--c:${REGION_COLORS[player.region] ?? "#9aa3b2"}">${player.region}</span></td>
        <td class="col-tiers">
          <ul class="tier-chips">
            ${tiers.map(([slug, tier]) => tierChip(slug, tier)).join("")}
          </ul>
        </td>
      </tr>`
    )
    .join("");

  hydrateHeads(body);
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

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
