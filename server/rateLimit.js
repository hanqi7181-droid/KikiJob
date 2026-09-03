const buckets = new Map();

export function createRateLimiter(options = {}) {
  const windowMs = Number(options.windowMs || process.env.RATE_LIMIT_WINDOW_MS || 60_000);
  const max = Number(options.max || process.env.RATE_LIMIT_MAX || 60);
  const message = options.message || '请求过于频繁，请稍后再试';

  return function rateLimit(request, response, keyParts = []) {
    const key = [...keyParts, getClientIp(request)].filter(Boolean).join(':');
    const now = Date.now();
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return false;
    }

    current.count += 1;
    if (current.count <= max) return false;

    response.writeHead(429, {
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json; charset=utf-8',
      'Retry-After': String(Math.ceil((current.resetAt - now) / 1000)),
    });
    response.end(JSON.stringify({ error: message }));
    return true;
  };
}

export function clearRateLimitBuckets() {
  buckets.clear();
}

function getClientIp(request) {
  const forwarded = request.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return request.socket?.remoteAddress || 'unknown';
}
