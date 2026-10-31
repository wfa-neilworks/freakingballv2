import worker from "./.open-next/dist/worker.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // Let Pages serve static assets directly
    if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/favicon")) {
      return env.ASSETS.fetch(request);
    }
    return worker.fetch(request, env, ctx);
  },
};
