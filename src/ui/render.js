import { DISCORD_URL, GAMEMODES, TIER_COLORS, TIER_LEVELS } from "../data.js";
import { EVENTS } from "../data/events.js";

const color = (tier) => TIER_COLORS[tier] ?? "#9aa3b2";

// Home gamemode tiles: icon, name, and a call to action.
export function renderModes() {
  const list = document.getElementById("mode-list");
  if (!list) return;

  list.innerHTML = GAMEMODES.map(
    (mode, i) => `
      <li class="${i === 0 ? "mode-wide" : ""}">
        <a class="mode" href="${DISCORD_URL}" target="_blank" rel="noopener" data-mode="${mode.slug}">
          <img class="mode-icon" src="/images/modes/${mode.slug}.png" alt="" width="48" height="48" loading="lazy" />
          <span class="mode-name">${mode.name}</span>
          <span class="mode-cta">Get tested<span aria-hidden="true"> →</span></span>
        </a>
      </li>`
  ).join("");
}

// Tier scale: five columns, one per level, each tier in its own colour.
export function renderLadder() {
  const ladder = document.getElementById("ladder");
  if (!ladder) return;

  ladder.innerHTML = TIER_LEVELS.map(
    (row) => `
      <div class="tier-col" style="--i:${row.level - 1}">
        <span class="tier-level">Level ${row.level}</span>
        <span class="badge" style="--c:${color(row.ht)}">${row.ht}</span>
        <span class="badge" style="--c:${color(row.lt)}">${row.lt}</span>
      </div>`
  ).join("");
}

// Events page list. Sorted upcoming first, then past.
export function renderEvents() {
  const list = document.getElementById("event-list");
  if (!list) return;

  const order = { live: 0, upcoming: 1, past: 2 };
  const sorted = [...EVENTS].sort((a, b) => order[a.status] - order[b.status] || a.date.localeCompare(b.date));

  list.innerHTML = sorted
    .map((ev) => {
      const date = new Date(`${ev.date}T00:00:00`).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      return `
        <li class="event event-${ev.status}">
          <div class="event-date">
            <span class="event-day">${new Date(`${ev.date}T00:00:00`).getDate()}</span>
            <span class="event-month">${date.split(" ")[1]}</span>
          </div>
          <div class="event-body">
            <div class="event-meta">
              <span class="event-status">${ev.status}</span>
              <span class="event-mode">${ev.mode}</span>
            </div>
            <h3>${ev.title}</h3>
            <p>${ev.summary}</p>
          </div>
        </li>`;
    })
    .join("");
}
