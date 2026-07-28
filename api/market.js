module.exports = async function handler(request, response) {
  try {
    const { getMarketPayload } = await import('../server/market-service.mjs');
    const origin = `https://${request.headers.host || 'localhost'}`;
    const payload = await getMarketPayload(new URL(request.url, origin));
    const status = payload.status || (payload.ok === false ? 500 : 200);
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=120');
    response.status(status).json(payload);
  } catch (error) {
    response.status(502).json({
      ok: false,
      error: error?.message || 'Market data unavailable',
      fetchedAt: Date.now(),
    });
  }
};
