import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface ConnectedClient {
  controller: ReadableStreamDefaultController<Uint8Array>;
  encoder: TextEncoder;
  userId?: string;
}

@Injectable()
export class NotificationGateway {
  private readonly logger = new Logger(NotificationGateway.name);
  private clients = new Map<string, ConnectedClient>();
  private clientCounter = 0;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register a new SSE client
   */
  subscribe(controller: ReadableStreamDefaultController<Uint8Array>, userId?: string): string {
    const clientId = `client_${++this.clientCounter}_${Date.now()}`;
    const client: ConnectedClient = {
      controller,
      encoder: new TextEncoder(),
      userId,
    };
    this.clients.set(clientId, client);
    this.logger.debug(`Client ${clientId} subscribed. Total clients: ${this.clients.size}`);
    return clientId;
  }

  /**
   * Unregister a client
   */
  unsubscribe(clientId: string): void {
    this.clients.delete(clientId);
    this.logger.debug(`Client ${clientId} unsubscribed. Total clients: ${this.clients.size}`);
  }

  /**
   * Broadcast a notification to all connected clients
   * Optionally filter by userId if userId is provided
   */
  broadcast(notification: any, targetUserId?: string): void {
    const data = `data: ${JSON.stringify(notification)}\n\n`;
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);

    const toRemove: string[] = [];
    this.clients.forEach((client, clientId) => {
      // If targetUserId is specified, only send to that user
      if (targetUserId && client.userId !== targetUserId) {
        return;
      }

      try {
        client.controller.enqueue(encodedData);
      } catch (err) {
        this.logger.warn(`Failed to send to client ${clientId}: ${err}`);
        toRemove.push(clientId);
      }
    });

    // Clean up failed clients
    toRemove.forEach((clientId) => this.unsubscribe(clientId));
  }

  /**
   * Send a notification to all clients or specific user
   * This is called by services to emit notifications
   */
  async sendNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    link?: string,
  ): Promise<any> {
    try {
      // Create notification in database
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          link,
          read: false,
        },
      });

      // Broadcast to SSE clients for this user
      this.broadcast(
        {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          link: notification.link,
          createdAt: notification.createdAt.toISOString(),
          read: notification.read,
        },
        userId,
      );

      return notification;
    } catch (err) {
      this.logger.error(`Failed to send notification: ${err}`);
      throw err;
    }
  }

  /**
   * Get active client count (for monitoring)
   */
  getClientCount(): number {
    return this.clients.size;
  }
}
