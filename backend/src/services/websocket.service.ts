import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { createLogger } from '../utils/logger';

const log = createLogger('WebSocket');

let wss: WebSocketServer | null = null;

export function setupWebSocket(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    log.info(`New WebSocket client connected (total: ${wss!.clients.size})`);

    ws.on('close', () => {
      log.info(`WebSocket client disconnected (total: ${wss!.clients.size})`);
    });

    ws.on('error', (err) => {
      log.error(`WebSocket error: ${err.message}`);
    });

    // Send welcome message
    ws.send(JSON.stringify({ type: 'connected', data: { message: 'Connected to VortexJob Scheduler' } }));
  });

  log.info('WebSocket server initialized on /ws');
  return wss;
}

export function broadcast(type: string, data: any): void {
  if (!wss) return;
  const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
