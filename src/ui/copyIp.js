import { SERVER_IP } from "../data.js";

// Wires every copy control on the page to the same behaviour.
// Each control shows its own confirmation text for a moment.
export function setupCopyIp() {
  document.querySelectorAll("[data-copy-ip], #copy-ip, #copy-ip-2").forEach((control) => {
    const label = control.querySelector("[data-copy-label], #copy-state") ?? control;
    const idle = label.textContent;
    let timer;

    control.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(SERVER_IP);
        label.textContent = "Copied";
      } catch {
        label.textContent = "Select and copy";
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        label.textContent = idle;
      }, 1800);
    });
  });
}
