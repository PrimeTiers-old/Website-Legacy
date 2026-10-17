// Hash routing between pages.
//   #/              Home
//   #/leaderboard   Leaderboard (optional ?q=name pre-fills the search)
//   #/events        Events
// Old links: #/rankings goes to the leaderboard.
// Plain anchors such as #how stay on Home and scroll to that section.

const ALIASES = { rankings: "leaderboard" };
const VIEWS = ["home", "leaderboard", "events"];

export function setupRouter() {
  window.addEventListener("hashchange", route);
  route();
}

function parse(hash) {
  const isRoute = hash.startsWith("#/");
  const [path, query = ""] = (isRoute ? hash.slice(2) : "").split("?");
  const requested = path || "home";
  const view = ALIASES[requested] ?? (VIEWS.includes(requested) ? requested : "home");
  return { isRoute, view, params: new URLSearchParams(query) };
}

function route() {
  const { isRoute, view, params } = parse(window.location.hash);

  document.querySelectorAll("[data-view]").forEach((el) => {
    el.hidden = el.dataset.view !== view;
  });
  document.querySelectorAll("[data-route]").forEach((link) => {
    link.setAttribute("aria-current", link.dataset.route === view ? "page" : "false");
  });

  if (view === "leaderboard" && params.has("q")) {
    window.dispatchEvent(new CustomEvent("pt:search", { detail: params.get("q") ?? "" }));
  }

  const hash = window.location.hash;
  if (!isRoute && hash) {
    const target = document.getElementById(hash.slice(1));
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
  }
  if (isRoute) window.scrollTo({ top: 0, behavior: "instant" });
}
