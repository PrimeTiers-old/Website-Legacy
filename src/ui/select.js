// Custom dropdown to replace the native <select>. Keyboard friendly:
//   Enter / Space or click opens the list. Arrow keys move. Enter picks. Escape closes.
// Options may carry a `color`, shown as a dot (used for regions and tiers).

let openSelect = null;

document.addEventListener("click", (e) => {
  if (openSelect && !openSelect.contains(e.target)) openSelect.close();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && openSelect) {
    const owner = openSelect;
    owner.close();
    owner.querySelector(".pt-select-btn").focus();
  }
});

export function createSelect({ label, options, value, onChange }) {
  const root = document.createElement("div");
  root.className = "pt-select";
  root.innerHTML = `
    <button type="button" class="pt-select-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="${label}">
      <span class="pt-select-dot"></span>
      <span class="pt-select-text"></span>
      <svg class="pt-select-caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <ul class="pt-select-menu" role="listbox" aria-label="${label}" hidden></ul>`;

  const btn = root.querySelector(".pt-select-btn");
  const menu = root.querySelector(".pt-select-menu");
  const text = root.querySelector(".pt-select-text");
  const dot = root.querySelector(".pt-select-btn .pt-select-dot");
  let current = value;

  const dotStyle = (color) => (color ? `background:${color}` : "display:none");

  const paint = () => {
    const sel = options.find((o) => o.value === current) ?? options[0];
    text.textContent = sel.label;
    // Pill options (tiers) fill the whole button with their colour when selected.
    btn.classList.toggle("is-pill", Boolean(sel.pill && sel.color));
    btn.style.setProperty("--c", sel.color ?? "");
    dot.setAttribute("style", dotStyle(sel.color));
    menu.innerHTML = options
      .map(
        (o) => `
        <li role="option" tabindex="-1" data-value="${o.value}" aria-selected="${o.value === current}"
            class="pt-select-option${o.value === current ? " is-selected" : ""}${o.pill ? " is-pill" : ""}" style="${o.pill && o.color ? `--c:${o.color}` : ""}">
          <span class="pt-select-dot" style="${dotStyle(o.color)}"></span>${o.label}
        </li>`
      )
      .join("");
  };

  const items = () => [...menu.querySelectorAll("[role=option]")];

  const open = () => {
    if (openSelect && openSelect !== root) openSelect.close();
    openSelect = root;
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    root.classList.add("is-open");
    const selected = menu.querySelector("[aria-selected=true]") ?? items()[0];
    selected?.focus();
  };

  root.close = () => {
    if (openSelect === root) openSelect = null;
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    root.classList.remove("is-open");
  };

  const choose = (val) => {
    current = val;
    paint();
    root.close();
    btn.focus();
    onChange(val);
  };

  btn.addEventListener("click", () => (menu.hidden ? open() : root.close()));
  btn.addEventListener("keydown", (e) => {
    if (["ArrowDown", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      open();
    }
  });

  menu.addEventListener("click", (e) => {
    const li = e.target.closest("[role=option]");
    if (li) choose(li.dataset.value);
  });

  menu.addEventListener("keydown", (e) => {
    const list = items();
    const i = list.indexOf(document.activeElement);
    if (e.key === "ArrowDown") list[Math.min(i + 1, list.length - 1)].focus();
    else if (e.key === "ArrowUp") list[Math.max(i - 1, 0)].focus();
    else if (e.key === "Home") list[0].focus();
    else if (e.key === "End") list[list.length - 1].focus();
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (i >= 0) choose(list[i].dataset.value);
    } else if (e.key === "Tab") root.close();
    else return;
    e.preventDefault();
  });

  paint();
  return root;
}
