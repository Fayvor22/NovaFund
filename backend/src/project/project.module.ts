import { Module } from '@nestjs/common';
import { ProjectResolver } from './project.resolver';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { InvestmentIntentService } from './investment-intent.service';
import { InvestmentIntentResolver } from './investment-intent.resolver';
import { StellarModule } from '../stellar/stellar.module';

@Module({
  imports: [StellarModule],
  providers: [ProjectResolver, ProjectService, InvestmentIntentService, InvestmentIntentResolver],
  controllers: [ProjectController],
  exports: [ProjectService, InvestmentIntentService],
})
export class ProjectModule {}
