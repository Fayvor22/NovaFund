import { Module } from '@nestjs/common';
import { GovernanceController } from './governance.controller';
import { GovernanceMetricsService } from './governance-metrics.service';
import { SignatureManagerService } from './signature-manager.service';
import { StellarModule } from '../stellar/stellar.module';

@Module({
  imports: [StellarModule],
  controllers: [GovernanceController],
  providers: [GovernanceMetricsService, SignatureManagerService],
  exports: [GovernanceMetricsService],
})
export class GovernanceModule {}
