// Worker entry. Serves the built site from ./dist and keeps the player lookup API.
// Deployed with `npx wrangler deploy`.

import { onRequestGet as uuidLookup } from "../functions/api/uuid/[name].js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const match = url.pathname.match(/^\/api\/uuid\/([^/]+)$/);
    if (match && request.method === "GET") {
      return uuidLookup({
        params: { name: decodeURIComponent(match[1]) },
        request,
        waitUntil: (promise) => ctx.waitUntil(promise),
      });
    }

    // Everything else is a static file from dist/ (pages, images, css, js).
    return env.ASSETS.fetch(request);
  },
};
