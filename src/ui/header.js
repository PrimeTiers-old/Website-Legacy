// Header behaviour: the dropdowns (Home, Server IP) and the player search box.

export function setupHeader() {
  setupDropdowns();
  setupSearch();
}

// Each dropdown opens on click and closes on outside click, Escape, or opening another one.
function setupDropdowns() {
  const dropdowns = [...document.querySelectorAll("[data-dropdown]")];

  const setOpen = (dropdown, open) => {
    const toggle = dropdown.querySelector("[data-dropdown-toggle]");
    const menu = dropdown.querySelector("[data-dropdown-menu]");
    dropdown.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    menu.hidden = !open;
  };

  dropdowns.forEach((dropdown) => {
    setOpen(dropdown, false);

    dropdown.querySelector("[data-dropdown-toggle]").addEventListener("click", (e) => {
      e.stopPropagation();
      const menu = dropdown.querySelector("[data-dropdown-menu]");
      dropdowns.forEach((other) => other !== dropdown && setOpen(other, false));
      setOpen(dropdown, menu.hidden);
    });

    dropdown.querySelector("[data-dropdown-menu]").addEventListener("click", (e) => {
      if (e.target.closest("a")) setOpen(dropdown, false);
    });
  });

  document.addEventListener("click", (e) => {
    dropdowns.forEach((dropdown) => {
      if (!dropdown.contains(e.target)) setOpen(dropdown, false);
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") dropdowns.forEach((dropdown) => setOpen(dropdown, false));
  });
}

// Search: Enter sends the user to the leaderboard filtered by that name.
function setupSearch() {
  const form = document.getElementById("player-search");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = form.querySelector("input");
    const q = input.value.trim();
    if (!q) return;
    window.location.hash = `#/leaderboard?q=${encodeURIComponent(q)}`;
    input.blur();
  });
}
