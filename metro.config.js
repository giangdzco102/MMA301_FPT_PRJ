const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Development-only proxy for the web build: the AI gateway rejects browser CORS
// preflight requests, so the web app calls /__ai/* on the dev server and this
// forwards it to EXPO_PUBLIC_AI_BASE_URL. Native apps call the gateway directly.
const PROXY_PREFIX = '/__ai/';
const upstream = (process.env.EXPO_PUBLIC_AI_BASE_URL ?? '').replace(/\/+$/, '');

const previousEnhance = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const base = previousEnhance ? previousEnhance(middleware, server) : middleware;
  return async (req, res, next) => {
    if (!upstream || !req.url.startsWith(PROXY_PREFIX)) return base(req, res, next);
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const response = await fetch(upstream + req.url.slice(PROXY_PREFIX.length - 1), {
        method: req.method,
        headers: {
          authorization: req.headers.authorization ?? '',
          'content-type': req.headers['content-type'] ?? 'application/json',
        },
        body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
      });
      res.statusCode = response.status;
      res.setHeader('content-type', response.headers.get('content-type') ?? 'application/json');
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      res.statusCode = 502;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: { message: String(error) } }));
    }
  };
};

module.exports = config;
