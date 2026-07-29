module.exports = async function handler(request, response) {
  try {
    const { getMarketPayload } = await import('../server/market-service.mjs');
    const origin = `https://${request.headers.host || 'localhost'}`;
    const url = new URL(request.url, origin);
    const payload = await getMarketPayload(url);
    const status = payload.status || (payload.ok === false ? 500 : 200);
    const resource = url.searchParams.get('resource') || 'overview';
    const cacheControl = resource === 'dexlaunch'
      ? 'public, s-maxage=86400, stale-while-revalidate=604800'
      : resource === 'history'
        ? 'public, s-maxage=3600, stale-while-revalidate=86400'
        : resource === 'caseweekly'
          ? 'public, s-maxage=21600, stale-while-revalidate=86400'
          : 'public, s-maxage=30, stale-while-revalidate=300';
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', cacheControl);
    response.status(status).json(payload);
  } catch (error) {
    response.status(502).json({
      ok: false,
      error: error?.message || 'Market data unavailable',
      fetchedAt: Date.now(),
    });
  }
};
