// Page-wide motion: hero entrance, word cascade, scroll reveals, count-up numbers,
// cursor spotlight on cards, scroll progress, and hero parallax.
//
// Everything hidden is gated on html.motion, so the page stays readable without JavaScript
// and for visitors who have reduced motion turned on.

const REVEAL = "[data-reveal]";
const SPOTLIGHT = ".mode, .panel, .cta";

export function setupMotion() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;

  document.documentElement.classList.add("motion");

  splitWords(document.querySelector("[data-split]"));
  markReveals();
  observeReveals();
  setupCounters();
  setupSpotlight();
  setupProgress();
  setupParallax();

  // Hidden views never intersect, so re-check reveals whenever the view changes.
  window.addEventListener("hashchange", observeReveals);
}

// Wraps each word in a span so CSS can stagger it. Text inside an element with class "accent"
// gets "accent-word" on each word, so the accent gradient can be applied to it.
// Keeps the child elements and their classes.
function splitWords(el) {
  if (!el) return;
  el.setAttribute("aria-label", el.textContent.trim());
  let index = 0;

  const walk = (node, accent) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (!part.trim()) {
            frag.append(part);
            return;
          }
          const word = document.createElement("span");
          word.className = accent ? "word accent-word" : "word";
          word.setAttribute("aria-hidden", "true");
          word.style.setProperty("--w", index++);
          const inner = document.createElement("span");
          inner.textContent = part;
          word.append(inner);
          frag.append(word);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child, accent || child.classList.contains("accent"));
      }
    });
  };

  walk(el, false);
}

// Marks sections and groups that should reveal as they enter the screen.
function markReveals() {
  document
    .querySelectorAll(
      "[data-view] .section-head, [data-view] .cta, [data-view] .community-copy, [data-view] .widget-wrap, [data-view] .tier-bar, [data-view] .table-wrap, [data-view] .filters"
    )
    .forEach((el) => el.setAttribute("data-reveal", ""));

  document.querySelectorAll("[data-stagger-root]").forEach((group) => {
    group.setAttribute("data-stagger", "");
    [...group.children].forEach((child, i) => child.style.setProperty("--i", i));
  });
}

let observer;
function observeReveals() {
  observer ??= new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
        entry.target.querySelectorAll("[data-count]").forEach(countUp);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );

  document.querySelectorAll(`[data-view]:not([hidden]) ${REVEAL}, [data-view]:not([hidden]) [data-stagger]`).forEach((el) => {
    if (!el.classList.contains("is-visible")) observer.observe(el);
  });
}

// Count-up numbers start at 0 and climb to their value when the stats strip is revealed.
function setupCounters() {
  document.querySelectorAll("[data-count]").forEach((el) => {
    el.textContent = "0";
  });
}

function countUp(el) {
  const target = Number(el.dataset.count);
  if (!Number.isFinite(target) || el.dataset.counted) return;
  el.dataset.counted = "true";

  const duration = 1100;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(target * eased).toString();
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Soft spotlight that follows the cursor across cards.
function setupSpotlight() {
  document.addEventListener("pointermove", (e) => {
    const card = e.target.closest?.(SPOTLIGHT);
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    card.style.setProperty("--my", `${e.clientY - rect.top}px`);
  });
}

// Thin bar at the top of the page showing scroll progress.
function setupProgress() {
  const bar = document.querySelector(".progress");
  if (!bar) return;
  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
        ticking = false;
      });
    },
    { passive: true }
  );
}

// Moves the hero art and orbs at a different speed to the page.
function setupParallax() {
  const layers = document.querySelectorAll("[data-depth]");
  if (!layers.length) return;
  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, 1200);
        layers.forEach((el) => {
          const depth = Number(el.dataset.depth);
          el.style.transform = `translate3d(0, ${y * depth}px, 0)`;
        });
        ticking = false;
      });
    },
    { passive: true }
  );
}
