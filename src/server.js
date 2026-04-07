/**
 * Static dev server — serves src/ with SPA fallback + local API mock.
 * In production, src/ deploys to CDN and api/ deploys to Lambda.
 * @module server
 */

import express from 'express';

/** @type {any} */
const app = express();

app.use('/api', express.json());
app.use('/api/webhook', express.raw({ type: 'application/json' }));

/**
 * Adapt a Lambda handler to an Express route.
 * @param {Function} handler
 * @param {(req: any) => Record<string, string>} [getPathParams]
 */
function lambdaRoute(handler, getPathParams) {
  return async (req, res) => {
    const event = {
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
      headers: req.headers,
      pathParameters: getPathParams ? getPathParams(req) : {},
    };
    try {
      const result = await handler(event);
      res.status(result.statusCode);
      if (result.headers) {
        for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
      }
      res.end(result.body);
    } catch (e) {
      console.error('API error:', e);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 *
 */
async function mountApi() {
  try {
    const { handler: checkout } = await import('../api/checkout.js');
    const { handler: webhook } = await import('../api/webhook.js');
    const { handler: stock } = await import('../api/stock.js');
    app.post('/api/checkout', lambdaRoute(checkout));
    app.post('/api/webhook', lambdaRoute(webhook));
    app.get(
      '/api/stock/:sku',
      lambdaRoute(stock, (req) => ({ sku: req.params.sku })),
    );
    console.log('  API routes mounted (local dev mode)');
  } catch (e) {
    console.warn('  API routes not mounted:', e.message);
  }
}

app.use(express.static('src'));

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.includes('.')) {
    return res.sendFile('index.html', { root: 'src' });
  }
  next();
});

/** @param {number} [port] */
export async function start(port = 3000) {
  await mountApi();
  const server = app.listen(port, () => console.log(`http://localhost:${port}`));
  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start(parseInt(process.env.PORT) || 3000);
}

export default app;
