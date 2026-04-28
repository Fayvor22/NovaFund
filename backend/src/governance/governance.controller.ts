import { BadRequestException, Controller, Get, NotFoundException, Query } from '@nestjs/common';
import { GovernanceMetricsService } from './governance-metrics.service';

@Controller('v1/governance')
export class GovernanceController {
  constructor(private readonly governanceMetrics: GovernanceMetricsService) {}

  @Get('financial-health')
  async getFinancialHealth(@Query('date') date?: string) {
    let report;

    if (date) {
      try {
        report = await this.governanceMetrics.getFinancialHealthByDate(date);
      } catch (err) {
        throw new BadRequestException('Invalid date format. Use ISO date string like YYYY-MM-DD.');
      }
    } else {
      report = await this.governanceMetrics.getLatestFinancialHealth();
    }

    if (!report) {
      throw new NotFoundException('No platform financial health report is available yet.');
    }

    return report;
  }
}
