import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '../database.module';
import { YieldService } from './yield.service';
import { YieldResolver } from './yield.resolver';
import { WaterfallEngineService } from './waterfall-engine.service';
import { YieldSnapshotService } from './yield-snapshot.service';

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot()],
  providers: [YieldService, YieldResolver, WaterfallEngineService, YieldSnapshotService],
})
export class YieldModule {}
