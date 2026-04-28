import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { MilestoneStatus } from '@prisma/client';
import { NotificationService } from 'src/notification/services/notification.service';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class MilestoneService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Updates a milestone's status.
   * When transitioning to DISPUTED, automatically fans out
   * email + SMS notifications to all project investors.
   * Also sends real-time in-app notifications.
   */
  async updateStatus(milestoneId: string, newStatus: MilestoneStatus) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { project: true },
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone ${milestoneId} not found`);
    }

    if (milestone.status === newStatus) {
      throw new BadRequestException(`Milestone is already in status ${newStatus}`);
    }

    // Persist the status change
    const updated = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: { status: newStatus },
    });

    // ── Hook: fire notifications based on status transition ──────────────────
    if (newStatus === MilestoneStatus.REJECTED) {
      // Fire-and-forget: don't block the API response
      this.notificationService
        .notifyDisputedMilestone(milestoneId)
        .catch((err) =>
          console.error(`Failed to send dispute notifications for milestone ${milestoneId}:`, err),
        );
    } else if (newStatus === MilestoneStatus.COMPLETED) {
      // Notify all investors that milestone was completed
      this.notifyMilestoneCompleted(milestone)
        .catch((err) =>
          console.error(`Failed to send completion notifications for milestone ${milestoneId}:`, err),
        );
    } else if (newStatus === MilestoneStatus.APPROVED) {
      // Notify all investors that milestone was approved
      this.notifyMilestoneApproved(milestone)
        .catch((err) =>
          console.error(`Failed to send approval notifications for milestone ${milestoneId}:`, err),
        );
    }

    return updated;
  }

  /**
   * Notify investors when a milestone is completed
   */
  private async notifyMilestoneCompleted(milestone: any): Promise<void> {
    const investors = await this.prisma.contribution.findMany({
      where: { projectId: milestone.projectId },
      distinct: ['investorId'],
      include: {
        investor: true,
      },
    });

    const milestonePath = `/projects/${milestone.projectId}/milestones/${milestone.id}`;

    for (const contribution of investors) {
      await this.notificationService.notify(
        contribution.investor.id,
        'MILESTONE',
        `Milestone Completed: ${milestone.title}`,
        `The milestone "${milestone.title}" in project "${milestone.project?.name || 'your project'}" has been completed successfully.`,
        milestonePath,
      );
    }
  }

  /**
   * Notify investors when a milestone is approved
   */
  private async notifyMilestoneApproved(milestone: any): Promise<void> {
    const investors = await this.prisma.contribution.findMany({
      where: { projectId: milestone.projectId },
      distinct: ['investorId'],
      include: {
        investor: true,
      },
    });

    const milestonePath = `/projects/${milestone.projectId}/milestones/${milestone.id}`;

    for (const contribution of investors) {
      await this.notificationService.notify(
        contribution.investor.id,
        'MILESTONE',
        `Milestone Approved: ${milestone.title}`,
        `The milestone "${milestone.title}" in project "${milestone.project?.name || 'your project'}" has been approved.`,
        milestonePath,
      );
    }
  }

  async findById(milestoneId: string) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { project: true },
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone ${milestoneId} not found`);
    }

    return milestone;
  }

  async findByProject(projectId: string) {
    return this.prisma.milestone.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  }
}

