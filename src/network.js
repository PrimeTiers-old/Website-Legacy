// /network: on load, times round trips from the visitor's browser straight to
// candidate server locations (direct to the provider's IP, no Cloudflare in
// the path), then posts the results to the API (saved in MongoDB).
import "./styles/base.css";
import "./styles/network.css";
import { API_BASE } from "./data.js";

// Every URL must be answered instantly by a server in that city, so one
// request ≈ one network round trip (ping). Each was checked to be a direct,
// in-region IP whose response time matches its TCP round trip. Don't use pages
// the server builds per request (Vultr's "/" added ~150 ms).
// Ids are stored in MongoDB; keep them stable.
const GROUPS = [
  {
    // The Cloudflare data center this player lands on: the first hop for
    // Spectrum, which would then carry traffic to our server over Cloudflare's
    // network. Same-origin, so we can read which colo answered.
    name: "Cloudflare",
    note: "Spectrum entry point",
    targets: [{ id: "cloudflare-edge", label: "Nearest edge", url: "/cdn-cgi/trace", method: "GET", readColo: true }],
  },
  {
    name: "Vultr",
    targets: [
      { id: "vultr-blr", label: "Bangalore", url: "https://blr-in-ping.vultr.com/favicon.ico" },
      { id: "vultr-del", label: "Delhi", url: "https://del-in-ping.vultr.com/favicon.ico" },
      { id: "vultr-bom", label: "Mumbai", url: "https://bom-in-ping.vultr.com/favicon.ico" },
      { id: "vultr-sgp", label: "Singapore", url: "https://sgp-ping.vultr.com/favicon.ico" },
    ],
  },
  {
    name: "Microsoft Azure",
    targets: [
      { id: "azure-bom", label: "Mumbai (West India)", url: "https://s3westindia.blob.core.windows.net/public/latency-test.json" },
      { id: "azure-pnq", label: "Pune (Central India)", url: "https://s3centralindia.blob.core.windows.net/public/latency-test.json" },
      { id: "azure-maa", label: "Chennai (South India)", url: "https://s3southindia.blob.core.windows.net/public/latency-test.json" },
      { id: "azure-sgp", label: "Singapore", url: "https://s3southeastasia.blob.core.windows.net/public/latency-test.json" },
    ],
  },
  {
    // Cloud Run answers at Google's nearest edge, then crosses Google's own
    // network to the region, the same path a Premium Tier VM would get.
    name: "Google Cloud",
    note: "via Google's network",
    targets: [
      { id: "gcp-bom", label: "Mumbai", url: "https://asia-south1-5tkroniexa-el.a.run.app/api/ping" },
      { id: "gcp-del", label: "Delhi", url: "https://asia-south2-5tkroniexa-em.a.run.app/api/ping" },
      { id: "gcp-sgp", label: "Singapore", url: "https://asia-southeast1-5tkroniexa-as.a.run.app/api/ping" },
    ],
  },
  {
    name: "Linode (Akamai)",
    targets: [
      { id: "linode-bom", label: "Mumbai", url: "https://in-bom-1.linodeobjects.com/" },
      { id: "linode-maa", label: "Chennai", url: "https://in-maa-1.linodeobjects.com/" },
      { id: "linode-sgp", label: "Singapore", url: "https://sg-sin-1.linodeobjects.com/" },
    ],
  },
  {
    name: "OVHcloud",
    targets: [
      { id: "ovh-bom", label: "Mumbai", url: "https://bom1-ynm1.speedtest.network.ovh.net/files/1Mb.dat" },
      { id: "ovh-sgp", label: "Singapore", url: "https://sin1-sgp.speedtest.network.ovh.net/files/1Mb.dat" },
    ],
  },
  {
    // PowerupStack's own ping endpoints (from its site). Hosted on OVH.
    // They reject HEAD (405), so these use GET; the body is 4 bytes ("pong").
    name: "PowerupStack",
    targets: [
      { id: "powerupstack-bom", label: "Mumbai", url: "https://mum01.powerupstack.net/v1/ping", method: "GET" },
      { id: "powerupstack-sgp", label: "Singapore", url: "https://asia-sgp09.powerupstack.com/v1/ping", method: "GET" },
    ],
  },
  {
    // Pay-by-the-hour Minecraft host. These are its own game nodes, the URLs its
    // site pings (Mumbai node on OVH, Singapore on Oracle Cloud). The Noida node
    // (ry.cubicloud.in:9000) didn't answer when added, so it's left out.
    name: "CubiCloud",
    note: "Minecraft, hourly",
    targets: [
      { id: "cubicloud-bom", label: "Mumbai", url: "https://mc.cubicloud.in:9090/" },
      { id: "cubicloud-sgp", label: "Singapore", url: "https://sg1.cubicloud.in:8080/" },
    ],
  },
  {
    // WiseHosting's own ping server (from its location finder). It has no
    // India location; Singapore is the nearest.
    name: "WiseHosting",
    note: "Minecraft",
    targets: [{ id: "wisehosting-sgp", label: "Singapore", url: "https://sg.ping.wisehosting.com:444/" }],
  },
  {
    // Hourly-billed Pakistan hosts (LightNode Karachi, Zenlayer Karachi,
    // LiteKeep Islamabad, ...) only publish ping-only test IPs, which a browser
    // can't reach. These are Ookla Speedtest servers on the main Pakistani
    // carrier networks in each city, so they show how well the player reaches
    // a server hosted in that city.
    name: "Pakistan",
    note: "carrier test servers",
    targets: [
      { id: "pk-khi-ptcl", label: "Karachi (PTCL)", url: "https://speedtest3.ptcl.net.prod.hosts.ooklaserver.net:8080/hello", method: "GET" },
      { id: "pk-khi-cyber", label: "Karachi (Cybernet)", url: "https://karachi-speedtest.cyber.net.pk.prod.hosts.ooklaserver.net:8080/hello", method: "GET" },
      { id: "pk-lhe-tes", label: "Lahore (Transworld)", url: "https://speedtestlhr.tes.com.pk:8080/hello", method: "GET" },
      { id: "pk-isb-tes", label: "Islamabad (Transworld)", url: "https://speedtestisb.tes.com.pk:8080/hello", method: "GET" },
      { id: "pk-isb-nayatel", label: "Islamabad (Nayatel)", url: "https://speedtest.nayatel.com:8080/hello", method: "GET" },
    ],
  },
  {
    // Hetzner's official Singapore test site. Couldn't confirm it answers from
    // a script (it closed the connection); browsers will show "failed" if not.
    name: "Hetzner Cloud",
    targets: [{ id: "hetzner-sin", label: "Singapore", url: "https://sin-speed.hetzner.com/100MB.bin" }],
  },
  {
    name: "IBM Cloud",
    targets: [
      { id: "ibm-bom", label: "Mumbai", url: "https://s3.in-mum.cloud-object-storage.appdomain.cloud/" },
      { id: "ibm-maa", label: "Chennai", url: "https://s3.che01.cloud-object-storage.appdomain.cloud/" },
      { id: "ibm-sgp", label: "Singapore", url: "https://s3.sng01.cloud-object-storage.appdomain.cloud/" },
    ],
  },
  {
    name: "Civo",
    targets: [{ id: "civo-bom", label: "Mumbai", url: "https://objectstore.mum1.civo.com/" }],
  },
  {
    // Alibaba closed its Mumbai region; Singapore is the nearest.
    name: "Alibaba Cloud",
    targets: [{ id: "alibaba-sgp", label: "Singapore", url: "https://oss-ap-southeast-1.aliyuncs.com/" }],
  },
];
const TARGETS = GROUPS.flatMap((g) => g.targets);

const SAMPLES = 8;
const TIMEOUT_MS = 4000;

const $ = (id) => document.getElementById(id);
const status = $("net-status");

// One collapsible section per provider. The summary line shows the provider's
// best location, so players don't need to open anything.
for (const g of GROUPS) {
  const box = document.createElement("details");
  box.className = "net-group";
  box.innerHTML = `<summary><span class="net-group-name"></span><span class="net-group-best mono">waiting</span></summary><ul class="net-list"></ul>`;
  const name = box.querySelector(".net-group-name");
  name.textContent = g.name;
  if (g.note) {
    const note = document.createElement("small");
    note.textContent = g.note;
    name.append(" ", note);
  }
  g.best = box.querySelector(".net-group-best");
  g.done = 0;
  for (const t of g.targets) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="net-name"></span><span class="net-bar"><i></i></span><span class="net-ms mono">waiting</span>`;
    li.querySelector(".net-name").textContent = t.label;
    t.el = li;
    t.group = g;
    box.querySelector("ul").append(li);
  }
  $("net-auto").append(box);
}

function grade(ms) {
  return ms == null ? "bad" : ms < 80 ? "good" : ms < 160 ? "ok" : "bad";
}

// Called when one of the group's targets finishes.
function updateGroup(g) {
  g.done++;
  const ok = g.targets.filter((t) => t.ms != null);
  if (g.done < g.targets.length) {
    g.best.textContent = `testing ${g.done}/${g.targets.length}…`;
    return;
  }
  if (!ok.length) {
    g.best.textContent = "failed";
    g.best.dataset.grade = "bad";
    return;
  }
  const best = ok.reduce((a, b) => (b.ms < a.ms ? b : a));
  g.best.textContent =
    g.targets.length > 1 || best.readColo ? `best ${Math.round(best.ms)} ms · ${best.label}` : `${Math.round(best.ms)} ms`;
  g.best.dataset.grade = grade(best.ms);
}

function show(t, text, ms) {
  t.el.querySelector(".net-ms").textContent = text;
  t.el.querySelector(".net-bar i").style.width = ms == null ? "0" : `${Math.max(4, 100 - Math.min(ms, 400) / 4)}%`;
  t.el.dataset.grade = grade(ms);
}

// One HEAD request. Uses the browser's own network timing for the request
// (Resource Timing), which leaves out JavaScript and event-loop delay; falls
// back to performance.now() if the entry is missing.
async function once(base, method = "HEAD") {
  const url = `${base}?t=${Math.random().toString(36).slice(2)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const start = performance.now();
  try {
    await fetch(url, { method, mode: "no-cors", cache: "no-store", signal: ctrl.signal });
    const end = performance.now();
    const entry = performance.getEntriesByName(url).pop();
    return entry && entry.duration > 0 ? entry.duration : end - start;
  } finally {
    clearTimeout(timer);
  }
}

// Reads `colo=XXX` from Cloudflare's /cdn-cgi/trace (same-origin, so readable).
async function readColo(url) {
  try {
    const text = await (await fetch(url, { cache: "no-store" })).text();
    return text.match(/^colo=([A-Z]{3})$/m)?.[1] ?? null;
  } catch {
    return null;
  }
}

async function measure(t) {
  show(t, "testing…", null);
  try {
    await once(t.url, t.method); // warm-up: opens the connection (DNS, TCP, TLS), not counted
    const times = [];
    for (let i = 0; i < SAMPLES; i++) {
      times.push(await once(t.url, t.method));
      show(t, `${Math.round(Math.min(...times))} ms…`, Math.min(...times));
    }
    // Display only; the API computes median/min/max/jitter from the raw samples.
    const sorted = [...times].sort((a, b) => a - b);
    const ms = sorted[Math.floor(sorted.length / 2)];
    show(t, `${Math.round(ms)} ms`, ms);
    t.ms = ms;
    const result = { id: t.id, samples: times }; // in the order taken, for jitter
    if (t.readColo) {
      const colo = await readColo(t.url);
      if (colo) {
        result.colo = colo;
        t.label = `${t.label} (${colo})`;
        t.el.querySelector(".net-name").textContent = t.label;
      }
    }
    return result;
  } catch {
    show(t, "failed", null);
    t.ms = null;
    return { id: t.id, samples: [] };
  } finally {
    updateGroup(t.group);
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
  // Every host at once (each is a different server, so they don't share a
  // connection). Each host's own samples stay sequential on one open
  // connection, so every sample is a single round trip. All results go to
  // the API in one request below.
  const results = await Promise.all(TARGETS.map(measure));

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
  const trace = $("net-trace").value.trim();
  if (!trace) {
    out.textContent = "Paste the tracert output first.";
    return;
  }
  const payload = { token, trace };
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
