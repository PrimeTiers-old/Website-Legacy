import { GUILD_ID } from "../data.js";

// Live Discord online count from the public widget. Keeps the default label if it is blocked.
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
