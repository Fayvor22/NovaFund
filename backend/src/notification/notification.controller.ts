import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PreferencesService } from './services/preferences.service';
import { NotificationGateway } from './notification.gateway';

@Controller('notifications')
export class NotificationController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly preferencesService: PreferencesService,
        private readonly gateway: NotificationGateway,
    ) { }

    @Get('settings/:userId')
    async getSettings(@Param('userId') userId: string) {
        return this.prisma.notificationSetting.upsert({
            where: { userId },
            update: {},
            create: { userId },
        });
    }

    @Put('settings/:userId')
    async updateSettings(
        @Param('userId') userId: string,
        @Body() settings: {
            emailEnabled?: boolean;
            pushEnabled?: boolean;
            notifyContributions?: boolean;
            notifyMilestones?: boolean;
            notifyDeadlines?: boolean;
        },
    ) {
        return this.prisma.notificationSetting.upsert({
            where: { userId },
            update: settings,
            create: {
                userId,
                ...settings,
            },
        });
    }

    @Get('preferences/:userId')
    async getPreferences(@Param('userId') userId: string) {
        return this.preferencesService.getUserPreferences(userId);
    }

    @Put('preferences/:userId')
    async updatePreferences(
        @Param('userId') userId: string,
        @Body() preferences: Record<string, Record<string, boolean>>,
    ) {
        return this.preferencesService.setPreferences(userId, preferences);
    }

    @Put('preferences/:userId/:eventType/:channel')
    async updatePreference(
        @Param('userId') userId: string,
        @Param('eventType') eventType: string,
        @Param('channel') channel: string,
        @Body() body: { enabled: boolean },
    ) {
        return this.preferencesService.setPreference(userId, eventType, channel, body.enabled);
    }

    @Post('subscribe/:userId')
    async subscribeToPush(
        @Param('userId') userId: string,
        @Body() subscription: any,
    ) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { pushSubscription: subscription },
        });
        return { success: true };
    }

    /**
     * Mark a notification as read
     * PATCH /notifications/:notificationId/read
     */
    @Put(':notificationId/read')
    async markAsRead(@Param('notificationId') notificationId: string) {
        const notification = await this.prisma.notification.update({
            where: { id: notificationId },
            data: { read: true },
        });
        return notification;
    }

    /**
     * Mark all notifications as read for a user
     * PUT /notifications/user/:userId/read-all
     */
    @Put('user/:userId/read-all')
    async markAllAsRead(@Param('userId') userId: string) {
        const result = await this.prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true },
        });
        return { updated: result.count };
    }

    /**
     * Get unread count for a user
     * GET /notifications/user/:userId/unread-count
     */
    @Get('user/:userId/unread-count')
    async getUnreadCount(@Param('userId') userId: string) {
        const count = await this.prisma.notification.count({
            where: { userId, read: false },
        });
        return { unreadCount: count };
    }

    /**
     * Emit a notification (for testing/internal use)
     * POST /notifications/emit
     */
    @Post('emit')
    async emitNotification(
        @Body() body: {
            userId: string;
            type: string;
            title: string;
            message: string;
            link?: string;
        },
    ) {
        const { userId, type, title, message, link } = body;
        const notification = await this.gateway.sendNotification(
            userId,
            type,
            title,
            message,
            link,
        );
        return notification;
    }
}

