import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';

export interface FinancialHealthReport {
  periodStart: string;
  periodEnd: string;
  incomingFeesStroops: string;
  incomingFeesXLM: string;
  sponsorshipCostsStroops: string;
  sponsorshipCostsXLM: string;
  netStroops: string;
  netXLM: string;
  feeEventCount: number;
  sponsorshipEventCount: number;
  generatedAt: string;
}

@Injectable()
export class GovernanceMetricsService {
  private readonly logger = new Logger(GovernanceMetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: 'UTC' })
  async publishDailyFinancialHealth(): Promise<void> {
    const periodEnd = this.startOfUtcDay(new Date());
    const periodStart = new Date(periodEnd);
    periodStart.setUTCDate(periodStart.getUTCDate() - 1);

    try {
      const report = await this.buildDailyFinancialHealthReport(periodStart, periodEnd);
      await this.savePlatformMetric(periodStart, periodEnd, report);
      this.logger.log(`Published daily financial health report for ${periodStart.toISOString()}`);
    } catch (error) {
      this.logger.error('Failed to publish daily financial health report', error as Error);
    }
  }

  async getLatestFinancialHealth(): Promise<FinancialHealthReport | null> {
    const rows = await this.prisma.$queryRaw<Array<{ summary: FinancialHealthReport }>>`
      SELECT summary
      FROM "platform_metrics"
      ORDER BY period_end DESC
      LIMIT 1
    `;

    return rows[0]?.summary ?? null;
  }

  async getFinancialHealthByDate(date: string): Promise<FinancialHealthReport | null> {
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date format, expected ISO date string.');
    }

    const periodStart = this.startOfUtcDay(parsedDate);
    const rows = await this.prisma.$queryRaw<Array<{ summary: FinancialHealthReport }>>`
      SELECT summary
      FROM "platform_metrics"
      WHERE period_start = ${periodStart}
      LIMIT 1
    `;

    return rows[0]?.summary ?? null;
  }

  private async buildDailyFinancialHealthReport(periodStart: Date, periodEnd: Date): Promise<FinancialHealthReport> {
    const operationalCostRow = await this.prisma.operationalCost.findUnique({
      where: { date: periodStart },
    });

    const incomingFees = operationalCostRow ? BigInt(operationalCostRow.totalFeeCharged) : 0n;
    const feeEventCount = operationalCostRow ? operationalCostRow.eventCount : 0;

    const feeBumpLogs = await this.prisma.indexerLog.findMany({
      where: {
        timestamp: {
          gte: periodStart,
          lt: periodEnd,
        },
        level: 'info',
      },
      select: {
        metadata: true,
      },
    });

    const sponsorshipEvents = feeBumpLogs.filter((row) => {
      const metadata = row.metadata as any;
      return metadata?.service === 'fee-bump-signer' && metadata?.outcome === 'SIGNED' && metadata?.maxFee != null;
    });

    const sponsorshipCosts = sponsorshipEvents.reduce((sum, row) => {
      const metadata = row.metadata as any;
      const maxFee = metadata?.maxFee;
      if (typeof maxFee === 'string' && maxFee.length > 0) {
        return sum + BigInt(maxFee);
      }
      if (typeof maxFee === 'number') {
        return sum + BigInt(maxFee);
      }
      return sum;
    }, 0n);

    const net = incomingFees - sponsorshipCosts;

    return {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      incomingFeesStroops: incomingFees.toString(),
      incomingFeesXLM: this.formatXlm(incomingFees),
      sponsorshipCostsStroops: sponsorshipCosts.toString(),
      sponsorshipCostsXLM: this.formatXlm(sponsorshipCosts),
      netStroops: net.toString(),
      netXLM: this.formatXlm(net),
      feeEventCount,
      sponsorshipEventCount: sponsorshipEvents.length,
      generatedAt: new Date().toISOString(),
    };
  }

  private async savePlatformMetric(periodStart: Date, periodEnd: Date, summary: FinancialHealthReport): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO "platform_metrics" ("period_start", "period_end", "summary", "created_at")
      VALUES (${periodStart}, ${periodEnd}, ${JSON.stringify(summary)}::jsonb, NOW())
      ON CONFLICT ("period_start", "period_end")
      DO UPDATE SET "summary" = EXCLUDED."summary", "created_at" = NOW()
    `;
  }

  private formatXlm(value: bigint): string {
    const sign = value < 0n ? '-' : '';
    const absolute = value < 0n ? -value : value;
    const whole = absolute / 10_000_000n;
    const fraction = absolute % 10_000_000n;
    return `${sign}${whole}.${fraction.toString().padStart(7, '0')}`;
  }

  private startOfUtcDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }
}
