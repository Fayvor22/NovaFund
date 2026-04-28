import { Injectable, Logger } from '@nestjs/common';
import { NotificationService } from '../notification/services/notification.service';
import { PrismaService } from '../prisma.service';

@Injectable()
export class YieldNotificationService {
  private readonly logger = new Logger(YieldNotificationService.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Notify investors when yield is generated/updated
   * Call this from the yield distribution/generation service
   */
  async notifyYieldGenerated(
    projectId: string,
    yieldAmount: number,
    yieldPercentage: number,
  ): Promise<void> {
    try {
      // Get all investors in the project
      const contributions = await this.prisma.contribution.findMany({
        where: { projectId },
        distinct: ['investorId'],
        include: {
          investor: true,
        },
      });

      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        this.logger.warn(`Project ${projectId} not found`);
        return;
      }

      // Notify each investor
      for (const contribution of contributions) {
        await this.notificationService.notify(
          contribution.investor.id,
          'CONTRIBUTION',
          `Yield Generated on "${project.title}"`,
          `Your investment has generated ${yieldPercentage}% yield. Total yield generated: $${yieldAmount.toFixed(2)}`,
          `/projects/${projectId}`,
        );
      }

      this.logger.log(`Yield notification sent to ${contributions.length} investors for project ${projectId}`);
    } catch (err) {
      this.logger.error(`Failed to send yield notifications: ${err}`);
    }
  }

  /**
   * Notify investors when yield distribution is available
   */
  async notifyYieldDistributionAvailable(
    projectId: string,
    distributionAmount: number,
  ): Promise<void> {
    try {
      const contributions = await this.prisma.contribution.findMany({
        where: { projectId },
        distinct: ['investorId'],
        include: {
          investor: true,
        },
      });

      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        this.logger.warn(`Project ${projectId} not found`);
        return;
      }

      // Notify each investor
      for (const contribution of contributions) {
        await this.notificationService.notify(
          contribution.investor.id,
          'CONTRIBUTION',
          `Yield Distribution Available on "${project.title}"`,
          `A new yield distribution of $${distributionAmount.toFixed(2)} is now available for withdrawal`,
          `/projects/${projectId}`,
        );
      }

      this.logger.log(
        `Yield distribution notification sent to ${contributions.length} investors for project ${projectId}`,
      );
    } catch (err) {
      this.logger.error(`Failed to send yield distribution notifications: ${err}`);
    }
  }

  /**
   * Notify investors when project yield APY changes
   */
  async notifyYieldAPYChanged(
    projectId: string,
    oldAPY: number,
    newAPY: number,
  ): Promise<void> {
    try {
      const contributions = await this.prisma.contribution.findMany({
        where: { projectId },
        distinct: ['investorId'],
        include: {
          investor: true,
        },
      });

      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        this.logger.warn(`Project ${projectId} not found`);
        return;
      }

      const trend = newAPY > oldAPY ? '📈 increased' : '📉 decreased';
      const difference = Math.abs(newAPY - oldAPY).toFixed(2);

      for (const contribution of contributions) {
        await this.notificationService.notify(
          contribution.investor.id,
          'CONTRIBUTION',
          `APY Update on "${project.title}"`,
          `Your project's annual percentage yield has ${trend} from ${oldAPY.toFixed(2)}% to ${newAPY.toFixed(2)}% (${difference}% change)`,
          `/projects/${projectId}`,
        );
      }

      this.logger.log(`APY change notification sent to ${contributions.length} investors for project ${projectId}`);
    } catch (err) {
      this.logger.error(`Failed to send APY change notifications: ${err}`);
    }
  }

  /**
   * Notify investors when project reaches a yield milestone
   */
  async notifyYieldMilestone(
    projectId: string,
    milestoneType: 'total_yield' | 'monthly_yield' | 'apy_target',
    milestoneValue: number,
    achievedValue: number,
  ): Promise<void> {
    try {
      const contributions = await this.prisma.contribution.findMany({
        where: { projectId },
        distinct: ['investorId'],
        include: {
          investor: true,
        },
      });

      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        this.logger.warn(`Project ${projectId} not found`);
        return;
      }

      let title = '';
      let message = '';

      switch (milestoneType) {
        case 'total_yield':
          title = `🎉 Total Yield Milestone Reached on "${project.title}"`;
          message = `Your project has generated a total of $${achievedValue.toFixed(2)} in yield! Target was $${milestoneValue.toFixed(2)}.`;
          break;
        case 'monthly_yield':
          title = `📊 Monthly Yield Goal Achieved on "${project.title}"`;
          message = `This month's yield of $${achievedValue.toFixed(2)} has exceeded the target of $${milestoneValue.toFixed(2)}!`;
          break;
        case 'apy_target':
          title = `⭐ APY Target Reached on "${project.title}"`;
          message = `Your project's APY has reached ${achievedValue.toFixed(2)}%, surpassing the target of ${milestoneValue.toFixed(2)}%!`;
          break;
      }

      for (const contribution of contributions) {
        await this.notificationService.notify(
          contribution.investor.id,
          'CONTRIBUTION',
          title,
          message,
          `/projects/${projectId}`,
        );
      }

      this.logger.log(
        `Yield milestone notification (${milestoneType}) sent to ${contributions.length} investors`,
      );
    } catch (err) {
      this.logger.error(`Failed to send yield milestone notifications: ${err}`);
    }
  }
}
