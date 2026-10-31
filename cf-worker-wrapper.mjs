import worker from "./.open-next/worker.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/_next/static/") || url.pathname === "/favicon.ico") {
      return env.ASSETS.fetch(request);
    }
    return worker.fetch(request, env, ctx);
  },
};
