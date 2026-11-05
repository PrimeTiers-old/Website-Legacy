// /network: on load, times round trips from the visitor's browser straight to
// candidate server locations (direct to the provider's IP, no Cloudflare in
// the path), then posts the results to the API (saved in MongoDB).
import "./styles/base.css";
import "./styles/network.css";
import { API_BASE } from "./data.js";

// Ids must match TARGETS in API/src/network.rs.
const TARGETS = [
  { id: "vultr-blr", label: "Vultr Bangalore", url: "https://blr-in-ping.vultr.com/favicon.ico" },
  { id: "vultr-del", label: "Vultr Delhi", url: "https://del-in-ping.vultr.com/favicon.ico" },
  { id: "vultr-bom", label: "Vultr Mumbai", url: "https://bom-in-ping.vultr.com/favicon.ico" },
];
// Each URL is a small static file: the server answers it instantly, so one
// request ≈ one network round trip (ping). Don't use "/" — Vultr builds that
// page per request, which added ~150 ms of server time.
// LightNode Karachi's test IP (38.60.217.49) only answers ICMP, which browsers
// can't send, so players can add it by hand after the auto report.

const SAMPLES = 8;
const TIMEOUT_MS = 4000;

const $ = (id) => document.getElementById(id);
const status = $("net-status");

for (const t of TARGETS) {
  const li = document.createElement("li");
  li.innerHTML = `<span class="net-name"></span><span class="net-bar"><i></i></span><span class="net-ms mono">waiting</span>`;
  li.querySelector(".net-name").textContent = t.label;
  t.el = li;
  $("net-auto").append(li);
}

function show(t, text, ms) {
  t.el.querySelector(".net-ms").textContent = text;
  t.el.querySelector(".net-bar i").style.width = ms == null ? "0" : `${Math.max(4, 100 - Math.min(ms, 400) / 4)}%`;
  t.el.dataset.grade = ms == null ? "bad" : ms < 80 ? "good" : ms < 160 ? "ok" : "bad";
}

// One HEAD request. Uses the browser's own network timing for the request
// (Resource Timing), which leaves out JavaScript and event-loop delay; falls
// back to performance.now() if the entry is missing.
async function once(base) {
  const url = `${base}?t=${Math.random().toString(36).slice(2)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const start = performance.now();
  try {
    await fetch(url, { method: "HEAD", mode: "no-cors", cache: "no-store", signal: ctrl.signal });
    const end = performance.now();
    const entry = performance.getEntriesByName(url).pop();
    return entry && entry.duration > 0 ? entry.duration : end - start;
  } finally {
    clearTimeout(timer);
  }
}

async function measure(t) {
  show(t, "testing…", null);
  try {
    await once(t.url); // warm-up: opens the connection (DNS, TCP, TLS), not counted
    const times = [];
    for (let i = 0; i < SAMPLES; i++) {
      times.push(await once(t.url));
      show(t, `${Math.round(Math.min(...times))} ms…`, Math.min(...times));
    }
    times.sort((a, b) => a - b);
    const ms = times[Math.floor(times.length / 2)];
    show(t, `${Math.round(ms)} ms`, ms);
    return { id: t.id, ms, min: times[0], manual: false };
  } catch {
    show(t, "failed", null);
    return { id: t.id, ms: null, min: null, manual: false };
  }
}

async function post(path, payload) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `error ${res.status}`);
  return body;
}

let token = null;

async function run() {
  status.textContent = "Testing… keep this page open.";
  performance.setResourceTimingBufferSize?.(500);
  const results = [];
  for (const t of TARGETS) results.push(await measure(t));

  status.textContent = "Sending results…";
  try {
    const res = await post("/api/network/report", { results });
    token = res.token;
    if (res.relay) $("net-relay").hidden = false;
    status.textContent = "Done. Your results were sent. Thanks!";
    $("net-extra").hidden = false;
  } catch (e) {
    status.textContent = `Couldn't send your results (${e.message}). Reload the page to try again.`;
  }
}

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

$("net-send").addEventListener("click", async () => {
  const out = $("net-extra-status");
  const khi = parseFloat($("net-khi").value);
  const trace = $("net-trace").value.trim();
  const payload = { token };
  if (Number.isFinite(khi) && khi >= 0) payload.khi_ms = khi;
  if (trace) payload.trace = trace;
  if (!payload.khi_ms && !payload.trace) {
    out.textContent = "Paste at least one result first.";
    return;
  }
  const btn = $("net-send");
  btn.disabled = true;
  out.textContent = "Sending…";
  try {
    await post("/api/network/report/extra", payload);
    out.textContent = "Added to your report. Thanks!";
  } catch (e) {
    out.textContent = `Couldn't send (${e.message}).`;
    btn.disabled = false;
  }
});

run();
