/**
 * Admin events — client-side WebSocket singleton for real-time updates.
 * Auto-reconnects. Subscribers register by event type.
 * @module admin/components/admin-events
 */

const listeners = new Map();
let ws = null;
let reconnectTimer = null;

function connect() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${proto}//${location.host}/admin/ws`);
  ws.onmessage = (e) => {
    try {
      const { type, data } = JSON.parse(e.data);
      const fns = listeners.get(type);
      if (fns) fns.forEach((fn) => fn(data));
      // Wildcard listeners
      const all = listeners.get('*');
      if (all) all.forEach((fn) => fn({ type, data }));
    } catch { /* ignore malformed */ }
  };
  ws.onclose = () => { reconnectTimer = setTimeout(connect, 3000); };
  ws.onerror = () => ws.close();
}

export function subscribe(type, fn) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(fn);
  if (!ws) connect();
  return () => { listeners.get(type)?.delete(fn); };
}

export function unsubscribe(type, fn) {
  listeners.get(type)?.delete(fn);
}

// Auto-connect on import
connect();
