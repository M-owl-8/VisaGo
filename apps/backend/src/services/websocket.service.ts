import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  applicationId?: string;
}

interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping';
  applicationId?: string;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
      console.log('[WebSocket] New connection attempt');

      // Extract token from query string or headers
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token =
        url.searchParams.get('token') || req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        console.log('[WebSocket] No token provided, closing connection');
        ws.close(1008, 'Authentication required');
        return;
      }

      // Verify JWT token
      if (!process.env.JWT_SECRET) {
        console.error('[WebSocket] JWT_SECRET not configured');
        ws.close(1008, 'Server configuration error');
        return;
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
          id: string;
          email: string;
        };
        ws.userId = decoded.id;
        console.log('[WebSocket] User authenticated:', decoded.id);
      } catch (error) {
        console.log('[WebSocket] Invalid token, closing connection');
        ws.close(1008, 'Invalid token');
        return;
      }

      // Handle messages
      ws.on('message', (data) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());

          if (message.type === 'subscribe' && message.applicationId) {
            ws.applicationId = message.applicationId;

            // Add to clients map
            if (!this.clients.has(message.applicationId)) {
              this.clients.set(message.applicationId, new Set());
            }
            this.clients.get(message.applicationId)?.add(ws);

            console.log('[WebSocket] Client subscribed to application:', message.applicationId);
            ws.send(JSON.stringify({ type: 'subscribed', applicationId: message.applicationId }));
          } else if (message.type === 'unsubscribe' && ws.applicationId) {
            this.clients.get(ws.applicationId)?.delete(ws);
            ws.applicationId = undefined;
            console.log('[WebSocket] Client unsubscribed');
          } else if (message.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      });

      ws.on('close', () => {
        if (ws.applicationId) {
          this.clients.get(ws.applicationId)?.delete(ws);
          console.log('[WebSocket] Client disconnected from application:', ws.applicationId);
        }
      });

      ws.on('error', (error) => {
        console.error('[WebSocket] Connection error:', error);
      });
    });

    console.log('[WebSocket] Server initialized on path /ws');
  }

  /**
   * Emit document status update to all clients subscribed to the application
   */
  emitDocumentStatusUpdate(applicationId: string, documentId: string, status: string, data?: any) {
    const clients = this.clients.get(applicationId);
    if (!clients || clients.size === 0) {
      console.log('[WebSocket] No clients subscribed to application:', applicationId);
      return;
    }

    const message = JSON.stringify({
      type: 'document:status-updated',
      applicationId,
      documentId,
      status,
      data,
      timestamp: new Date().toISOString(),
    });

    let sentCount = 0;
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        sentCount++;
      }
    });

    console.log('[WebSocket] Sent document status update to', sentCount, 'clients');
  }

  /**
   * Emit document verified event
   */
  emitDocumentVerified(applicationId: string, documentId: string, data: any) {
    this.emitDocumentStatusUpdate(applicationId, documentId, 'verified', data);
  }

  /**
   * Emit document rejected event
   */
  emitDocumentRejected(applicationId: string, documentId: string, data: any) {
    this.emitDocumentStatusUpdate(applicationId, documentId, 'rejected', data);
  }

  /**
   * Emit progress update event
   */
  emitProgressUpdate(applicationId: string, progress: number) {
    const clients = this.clients.get(applicationId);
    if (!clients || clients.size === 0) return;

    const message = JSON.stringify({
      type: 'progress:updated',
      applicationId,
      progress,
      timestamp: new Date().toISOString(),
    });

    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  /**
   * Get connection stats
   */
  getStats() {
    const totalApplications = this.clients.size;
    let totalConnections = 0;
    this.clients.forEach((clients) => {
      totalConnections += clients.size;
    });

    return {
      totalApplications,
      totalConnections,
      applications: Array.from(this.clients.keys()),
    };
  }
}

export const websocketService = new WebSocketService();
