import "./styles/index.css";
import { renderModes, renderLadder, renderEvents } from "./ui/render.js";
import { setupCopyIp } from "./ui/copyIp.js";
import { loadOnlineCount } from "./ui/discord.js";
import { setupMotion } from "./ui/motion.js";
import { setupRankings } from "./ui/rankings.js";
import { setupRouter } from "./ui/router.js";
import { setupHeader } from "./ui/header.js";

renderModes();
renderLadder();
renderEvents();
setupCopyIp();
loadOnlineCount();
setupRankings();
setupHeader();
setupRouter();
setupMotion();

document.getElementById("year").textContent = new Date().getFullYear();
