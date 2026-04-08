/**
 * Dev server — serves src/ with SPA fallback + local API mock.
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
 * @param {(req: any) => Record<string, string>} [getQueryParams]
 */
function lambdaRoute(handler, getPathParams, getQueryParams) {
  return async (req, res) => {
    const event = {
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
      headers: req.headers,
      pathParameters: getPathParams ? getPathParams(req) : {},
      queryStringParameters: getQueryParams ? getQueryParams(req) : {},
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
    const { handler: orders } = await import('../api/orders.js');
    const { handler: session } = await import('../api/session.js');
    app.post('/api/checkout', lambdaRoute(checkout));
    app.post('/api/webhook', lambdaRoute(webhook));
    app.get(
      '/api/stock/:sku',
      lambdaRoute(stock, (req) => ({ sku: req.params.sku })),
    );
    app.get(
      '/api/orders',
      lambdaRoute(orders, null, (req) => req.query),
    );
    app.get(
      '/api/session/:id',
      lambdaRoute(session, (req) => ({ id: req.params.id })),
    );
    console.log('  API routes mounted (local dev mode)');
  } catch (e) {
    console.warn('  API routes not mounted:', e.message);
  }
}

app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      'img-src * data:',
      "connect-src 'self' https://checkout.stripe.com https://api.stripe.com",
      'frame-src https://checkout.stripe.com',
    ].join('; '),
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use('/staticart.config.json', express.static('staticart.config.json'));
app.use(express.static('src'));

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.includes('.') && !req.path.startsWith('/api/')) {
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
