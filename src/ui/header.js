// Header behaviour: the Home dropdown and the player search box.

export function setupHeader() {
  setupDropdown();
  setupSearch();
}

// Home dropdown: opens on click, closes on outside click or Escape.
function setupDropdown() {
  const dropdown = document.querySelector("[data-dropdown]");
  if (!dropdown) return;
  const toggle = dropdown.querySelector("[data-dropdown-toggle]");
  const menu = dropdown.querySelector("[data-dropdown-menu]");

  const set = (open) => {
    dropdown.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    menu.hidden = !open;
  };

  set(false);
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    set(menu.hidden);
  });
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) set(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") set(false);
  });
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a")) set(false);
  });
}

// Search: Enter sends the user to the leaderboard filtered by that name.
function setupSearch() {
  const form = document.getElementById("player-search");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = form.querySelector("input").value.trim();
    if (!q) return;
    window.location.hash = `#/leaderboard?q=${encodeURIComponent(q)}`;
    form.querySelector("input").blur();
  });
}
