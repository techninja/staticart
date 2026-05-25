/**
 * Admin WebSocket — broadcasts real-time events to connected admin clients.
 * Attaches to the HTTP server. Clients connect at ws://host/admin/ws.
 * @module admin/api/admin-ws
 */

import { WebSocketServer } from 'ws';

/** @type {Set<import('ws').WebSocket>} */
const clients = new Set();
let wss = null;

/**
 * Attach WebSocket server to an existing HTTP server.
 * @param {import('http').Server} server
 */
export function attachWs(server) {
  wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (req, socket, head) => {
    if (req.url !== '/admin/ws') { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });
  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
    ws.on('error', () => clients.delete(ws));
  });
}

/**
 * Broadcast an event to all connected admin clients.
 * @param {string} type - Event type (e.g. 'mockup:status', 'mockup:done')
 * @param {any} data - Event payload
 */
export function broadcast(type, data) {
  const msg = JSON.stringify({ type, data, ts: Date.now() });
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

/** Number of connected clients. */
export function clientCount() { return clients.size; }
