import { Controller, Get, Res, Query } from '@nestjs/common';
import { Response } from 'express';
import { NotificationGateway } from './notification.gateway';
import { PrismaService } from '../prisma.service';

@Controller('notifications')
export class NotificationGatewayController {
  constructor(
    private readonly gateway: NotificationGateway,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /notifications/stream
   * Server-Sent Events (SSE) endpoint for real-time notifications
   * Sends existing notification history, then streams new ones
   */
  @Get('stream')
  async stream(
    @Res() res: Response,
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // TODO: Implement SSE streaming with proper controller
    // For now, just send historical notifications and close
    if (userId) {
      const historyLimit = Math.min(100, Math.max(1, parseInt(limit ?? '50', 10)));
      const history = await this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: historyLimit,
      });

      history.reverse().forEach((n) => {
        const data = `data: ${JSON.stringify({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          link: (n.data as any)?.link,
          createdAt: n.createdAt.toISOString(),
          read: n.read,
        })}\n\n`;
        res.write(data);
      });
    }

    res.end();
  }

  /**
   * GET /notifications/history?limit=50&userId=...
   * Get notification history from database
   */
  @Get('history')
  async history(@Query('userId') userId?: string, @Query('limit') limit?: string) {
    if (!userId) {
      return { error: 'userId is required' };
    }

    const historyLimit = Math.min(100, Math.max(1, parseInt(limit ?? '50', 10)));
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: historyLimit,
    });

    return notifications
      .reverse()
      .map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: (n.data as any)?.link,
        createdAt: n.createdAt.toISOString(),
        read: n.read,
      }));
  }
}
