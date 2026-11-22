/* One deployment boundary. Viewers keep accepting their existing ?file URLs. */
(() => {
  'use strict';
  const config = window.SiteDeployment;
  if (!config) return;
  const assetUrl = key => {
    if (!Object.prototype.hasOwnProperty.call(config.assets, key)) {
      throw new Error(`Unknown logical asset: ${key}`);
    }
    return config.assets[key];
  };
  window.SiteAssets = Object.freeze({ resolve: assetUrl });
  const url = new URL(location.href);
  if (url.searchParams.has('asset')) {
    const id = url.searchParams.get('asset');
    url.searchParams.set(config.assetParameters?.[id] || 'file', assetUrl(id));
    history.replaceState(null, '', url);
  }
  if (config.target !== 'pages') return;
  // Pages cannot run PHP. Fixture-backed reads and local-only writes let the
  // same clients run in staging. Nothing is sent to production services.
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input, location.href);
    const relative = requestUrl.pathname.startsWith(config.basePath + '/')
      ? requestUrl.pathname.slice(config.basePath.length) : requestUrl.pathname;
    if (requestUrl.origin !== location.origin || !relative.endsWith('.php')) {
      return realFetch(input, init);
    }
    const fixture = config.apiFixtures[relative];
    return new Response(JSON.stringify(fixture?.body || { error: 'This live service needs NTNU; no fixture is configured.' }), {
      status: fixture?.status || (fixture ? 200 : 501),
      headers: { 'Content-Type': 'application/json', 'X-Staging-Fixture': 'true' }
    });
  };
})();
