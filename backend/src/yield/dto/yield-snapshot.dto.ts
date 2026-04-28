import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class YieldSnapshotPoint {
  @Field(() => String, { description: 'UTC snapshot date for the yield data point' })
  snapshotDate: string;

  @Field(() => String, { description: 'Annualized percentage yield at this snapshot' })
  apy: string;

  @Field(() => String, { description: 'Yield earned during the snapshot window' })
  dailyYield: string;

  @Field(() => String, { description: 'Total principal used to calculate APY' })
  totalPrincipal: string;

  @Field(() => String, { nullable: true, description: 'Asset in which the yield was measured' })
  asset?: string | null;
}

@ObjectType()
export class YieldTrend {
  @Field(() => [YieldSnapshotPoint], { description: 'Yield snapshots for the last 7 days' })
  last7Days: YieldSnapshotPoint[];

  @Field(() => [YieldSnapshotPoint], { description: 'Yield snapshots for the last 30 days' })
  last30Days: YieldSnapshotPoint[];

  @Field(() => [YieldSnapshotPoint], { description: 'Yield snapshots for the last 90 days' })
  last90Days: YieldSnapshotPoint[];
}
