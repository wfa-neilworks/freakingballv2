import worker from "./.open-next/worker.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // Try static assets first
    if (
      url.pathname.startsWith("/_next/") ||
      url.pathname === "/favicon.ico" ||
      url.pathname === "/BUILD_ID"
    ) {
      const assetResponse = await env.ASSETS.fetch(request).catch(() => null);
      if (assetResponse && assetResponse.status !== 404) {
        return assetResponse;
      }
    }
    return worker.fetch(request, env, ctx);
  },
};
