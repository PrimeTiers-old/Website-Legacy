import { defineConfig } from "vite";

// Local stand-in for functions/api/uuid/[name].js.
// Cloudflare Pages Functions only run when deployed, so `npm run dev` and `npm run preview`
// use this instead. Same behaviour: premium -> { premium: true, uuid }, otherwise { premium: false }.
const NAME = /^[A-Za-z0-9_]{3,16}$/;

function uuidApi() {
  const handle = async (req, res, next) => {
    const match = req.url?.match(/^\/api\/uuid\/([^/?]+)/);
    if (!match) return next();

    const name = decodeURIComponent(match[1]);
    const send = (status, body) => {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=300");
      res.end(JSON.stringify(body));
    };

    if (!NAME.test(name)) return send(400, { error: "Invalid username" });

    try {
      const r = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(name)}`);
      if (r.status === 200) {
        const p = await r.json();
        return send(200, { name: p.name, premium: true, uuid: p.id });
      }
      if (r.status === 204 || r.status === 404) return send(200, { name, premium: false });
      return send(503, { name, premium: null, error: "Lookup unavailable" });
    } catch {
      return send(503, { name, premium: null, error: "Lookup unavailable" });
    }
  };

  return {
    name: "uuid-api",
    configureServer(server) {
      server.middlewares.use(handle);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle);
    },
  };
}

export default defineConfig({
  plugins: [uuidApi()],
  build: { outDir: "dist", target: "es2020" },
});
