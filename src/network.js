// /network: times HTTPS round trips from the visitor's browser to candidate
// server locations and posts the results to the API (saved in MongoDB).
import "./styles/base.css";
import "./styles/network.css";
import { API_BASE } from "./data.js";

// Ids must match TARGETS in API/src/network.rs.
const TARGETS = [
  { id: "vultr-blr", label: "Vultr Bangalore", url: "https://blr-in-ping.vultr.com/" },
  { id: "vultr-del", label: "Vultr Delhi", url: "https://del-in-ping.vultr.com/" },
  { id: "vultr-bom", label: "Vultr Mumbai", url: "https://bom-in-ping.vultr.com/" },
];
// LightNode Karachi test IP (38.60.217.49) only answers ICMP, so it's entered by hand.
const MANUAL_ID = "lightnode-khi";

const SAMPLES = 8;
const TIMEOUT_MS = 4000;

const results = new Map();
const $ = (id) => document.getElementById(id);
const list = $("net-auto");
const runBtn = $("net-run");
const sendBtn = $("net-send");
const status = $("net-status");

function row(t) {
  const li = document.createElement("li");
  li.innerHTML = `<span class="net-name"></span><span class="net-bar"><i></i></span><span class="net-ms mono">–</span>`;
  li.querySelector(".net-name").textContent = t.label;
  t.el = li;
  list.append(li);
}
TARGETS.forEach(row);

function show(t, text, ms) {
  t.el.querySelector(".net-ms").textContent = text;
  const bar = t.el.querySelector(".net-bar i");
  bar.style.width = ms == null ? "0" : `${Math.max(4, 100 - Math.min(ms, 400) / 4)}%`;
  t.el.dataset.grade = ms == null ? "bad" : ms < 80 ? "good" : ms < 160 ? "ok" : "bad";
}

async function once(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const start = performance.now();
  try {
    // no-cors + HEAD: we only need the timing, not the response.
    await fetch(`${url}?t=${Math.random()}`, { method: "HEAD", mode: "no-cors", cache: "no-store", signal: ctrl.signal });
    return performance.now() - start;
  } finally {
    clearTimeout(timer);
  }
}

async function measure(t) {
  show(t, "testing…", null);
  try {
    await once(t.url); // warm-up: DNS + TCP + TLS, not counted
    const times = [];
    for (let i = 0; i < SAMPLES; i++) {
      times.push(await once(t.url));
      show(t, `${Math.round(Math.min(...times))} ms…`, Math.min(...times));
    }
    times.sort((a, b) => a - b);
    const ms = times[Math.floor(times.length / 2)];
    results.set(t.id, { id: t.id, ms, min: times[0], manual: false });
    show(t, `${Math.round(ms)} ms`, ms);
  } catch {
    results.set(t.id, { id: t.id, ms: null, min: null, manual: false });
    show(t, "failed", null);
  }
}

runBtn.addEventListener("click", async () => {
  runBtn.disabled = sendBtn.disabled = true;
  runBtn.textContent = "Testing…";
  status.textContent = "";
  for (const t of TARGETS) await measure(t);
  runBtn.disabled = sendBtn.disabled = false;
  runBtn.textContent = "Run again";
});

document.querySelectorAll("[data-copy]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($(btn.dataset.copy).textContent);
      btn.textContent = "Copied";
      setTimeout(() => (btn.textContent = "Copy"), 1500);
    } catch {
      /* clipboard blocked; the command is visible to copy by hand */
    }
  });
});

sendBtn.addEventListener("click", async () => {
  const payload = { results: [...results.values()] };
  const khi = parseFloat($("net-khi").value);
  if (Number.isFinite(khi) && khi >= 0) payload.results.push({ id: MANUAL_ID, ms: khi, manual: true });
  const name = $("net-name").value.trim();
  if (name) payload.name = name;
  const trace = $("net-trace").value.trim();
  if (trace) payload.trace = trace;

  sendBtn.disabled = true;
  status.textContent = "Sending…";
  try {
    const res = await fetch(`${API_BASE}/api/network/report`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      status.textContent = "Thanks! Your results were sent.";
      return;
    }
    const body = await res.json().catch(() => ({}));
    status.textContent = `Couldn't send: ${body.error ?? res.status}`;
  } catch {
    status.textContent = "Couldn't reach the server. Try again in a moment.";
  }
  sendBtn.disabled = false;
});
