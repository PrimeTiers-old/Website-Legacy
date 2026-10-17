import { GUILD_ID } from "../data.js";

// Reads the public Discord widget JSON for the live online count.
// Fails quietly and keeps the default label if the request is blocked.
export async function loadOnlineCount() {
  const value = document.getElementById("online");
  if (!value) return;

  try {
    const res = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/widget.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    value.textContent = (data.presence_count ?? 0).toLocaleString();
  } catch {
    value.textContent = "Live";
  }
}
