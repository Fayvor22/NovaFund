import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma.service';
import { NotificationService } from '../notification/services/notification.service';
import { StellarService } from '../stellar/stellar.service';

@Injectable()
@Processor('refund')
export class RefundJob extends WorkerHost {
  private readonly logger = new Logger(RefundJob.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private stellarService: StellarService,
  ) {
    super();
  }

  async process(job: Job<{ projectId: string }>): Promise<void> {
    const { projectId } = job.data;

    try {
      this.logger.log(`Starting refund process for failed project ${projectId}`);

      // TODO: Implement refunded field in Contribution schema
      // Get all contributions for the project
      const contributions = await this.prisma.contribution.findMany({
        where: {
          projectId,
        },
      });

      if (contributions.length === 0) {
        this.logger.log(`No contributions to refund for project ${projectId}`);
        return;
      }

      let refundedCount = 0;
      let failedCount = 0;

      for (const contribution of contributions) {
        try {
          // Process refund via Stellar service
          // TODO: Contribution uses investorId, not userId
          await this.stellarService.processRefund(contribution.investorId, contribution.amount);

          // TODO: Mark as refunded when field is added to schema
          // await this.prisma.contribution.update({
          //   where: { id: contribution.id },
          //   data: { refunded: true, refundedAt: new Date() },
          // });

          // Send notification
          await this.notificationService.notify(
            contribution.investorId,
            'CONTRIBUTION',
            'Refund Processed',
            `Your contribution of ${contribution.amount} has been refunded for project ${projectId}.`
          );

          refundedCount++;
        } catch (error) {
          this.logger.error(`Failed to refund contribution ${contribution.id}`, error);
          failedCount++;
        }
      }

      this.logger.log(`Refund process completed for project ${projectId}: ${refundedCount} refunded, ${failedCount} failed`);
    } catch (error) {
      this.logger.error(`Refund job failed for project ${projectId}`, error);
      throw error;
    }
  }
}