import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { YieldService } from './yield.service';
import { YieldSnapshotService } from './yield-snapshot.service';
import { YieldStats } from './dto/yield-stats.dto';
import {
  WaterfallSimulation,
  WaterfallTier,
  WaterfallTierInput,
  WaterfallRecipientType,
} from './dto/waterfall.dto';
import { YieldSnapshotPoint, YieldTrend } from './dto/yield-snapshot.dto';

@Resolver()
export class YieldResolver {
  constructor(
    private readonly yieldService: YieldService,
    private readonly yieldSnapshotService: YieldSnapshotService,
  ) {}

  @Query(() => YieldStats, {
    name: 'totalYield',
    description: 'Aggregates total yield generated across all active escrows',
  })
  async getTotalYield(): Promise<YieldStats> {
    return this.yieldService.getAggregatedYield();
  }

  @Query(() => [WaterfallTier], {
    name: 'projectWaterfallTiers',
    description: 'Returns configured waterfall payout tiers for a project',
  })
  async getProjectWaterfall(
    @Args('projectId') projectId: string,
  ): Promise<WaterfallTier[]> {
    const tiers = await this.yieldService.getProjectWaterfall(projectId);
    return tiers.map((tier) => ({
      tierOrder: tier.tierOrder,
      recipientType: tier.recipientType as WaterfallRecipientType,
      maxAmount: tier.maxAmount === null ? null : tier.maxAmount.toString(),
    }));
  }

  @Mutation(() => [WaterfallTier], {
    name: 'configureProjectWaterfallTiers',
    description: 'Configures per-project waterfall payout tiers',
  })
  async configureProjectWaterfall(
    @Args('projectId') projectId: string,
    @Args({ name: 'tiers', type: () => [WaterfallTierInput] }) tiers: WaterfallTierInput[],
  ): Promise<WaterfallTier[]> {
    const configured = await this.yieldService.configureProjectWaterfall(
      projectId,
      tiers.map((tier) => ({
        tierOrder: tier.tierOrder,
        recipientType: tier.recipientType,
        maxAmount: tier.maxAmount ?? null,
      })),
    );

    return configured.map((tier) => ({
      tierOrder: tier.tierOrder,
      recipientType: tier.recipientType as WaterfallRecipientType,
      maxAmount: tier.maxAmount === null ? null : tier.maxAmount.toString(),
    }));
  }

  @Query(() => WaterfallSimulation, {
    name: 'simulateWaterfallPayout',
    description: 'Simulates payout distribution based on configured waterfall tiers',
  })
  async simulateWaterfallPayout(
    @Args('projectId') projectId: string,
    @Args('payoutAmount') payoutAmount: string,
  ): Promise<WaterfallSimulation> {
    return this.yieldService.simulateProjectWaterfall(projectId, payoutAmount);
  }

  @Query(() => [YieldSnapshotPoint], {
    name: 'projectYieldHistory',
    description: 'Returns daily yield snapshot history for a project',
  })
  async getProjectYieldHistory(
    @Args('projectId') projectId: string,
    @Args('days', { type: () => Number, nullable: true }) days = 90,
  ): Promise<YieldSnapshotPoint[]> {
    return this.yieldSnapshotService.getProjectYieldHistory(projectId, days);
  }

  @Query(() => YieldTrend, {
    name: 'projectYieldTrends',
    description: 'Returns APY trend snapshots for the last 7, 30, and 90 days',
  })
  async getProjectYieldTrends(@Args('projectId') projectId: string): Promise<YieldTrend> {
    return this.yieldSnapshotService.getProjectYieldTrends(projectId);
  }
}
