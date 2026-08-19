const stores = new Map();
const MAX_CLIENTS_PER_POLICY = 10_000;

function headerValue(request, name) {
  const value = request.headers?.[name];
  return Array.isArray(value) ? value[0] : value;
}

export function isJsonRequest(request) {
  const contentType = headerValue(request, 'content-type');
  return typeof contentType === 'string' && contentType.split(';', 1)[0].trim().toLowerCase() === 'application/json';
}

export function getClientId(request) {
  const forwarded = headerValue(request, 'x-forwarded-for');
  const candidate = typeof forwarded === 'string' ? forwarded.split(',', 1)[0].trim() : '';
  const address = candidate || request.socket?.remoteAddress || 'unknown';
  return String(address).slice(0, 128);
}

export function checkRateLimit(policy, request, { limit, windowMs }, now = Date.now()) {
  let clients = stores.get(policy);
  if (!clients) {
    clients = new Map();
    stores.set(policy, clients);
  }

  if (clients.size >= MAX_CLIENTS_PER_POLICY) {
    for (const [client, entry] of clients) {
      if (entry.resetAt <= now) clients.delete(client);
    }
    if (clients.size >= MAX_CLIENTS_PER_POLICY) clients.delete(clients.keys().next().value);
  }

  const client = getClientId(request);
  let entry = clients.get(client);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    clients.set(client, entry);
  }
  entry.count += 1;

  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
  };
}

export function resetRateLimitsForTests() {
  stores.clear();
}
