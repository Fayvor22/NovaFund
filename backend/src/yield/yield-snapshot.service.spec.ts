import { YieldSnapshotService } from './yield-snapshot.service';

describe('YieldSnapshotService', () => {
  let service: YieldSnapshotService;
  const prismaMock: any = {
    project: { findMany: jest.fn() },
    yieldEvent: { groupBy: jest.fn() },
    yieldSnapshot: { findMany: jest.fn(), upsert: jest.fn() },
  };

  beforeEach(() => {
    prismaMock.project.findMany.mockReset();
    prismaMock.yieldEvent.groupBy.mockReset();
    prismaMock.yieldSnapshot.findMany.mockReset();
    prismaMock.yieldSnapshot.upsert.mockReset();
    service = new YieldSnapshotService(prismaMock);
  });

  it('returns historical yield snapshots in ascending order', async () => {
    prismaMock.yieldSnapshot.findMany.mockResolvedValue([
      {
        snapshotDate: new Date('2026-04-26T00:00:00.000Z'),
        apy: '1.234500',
        dailyYield: 12345n,
        totalPrincipal: 1000000n,
        asset: 'XLM',
      },
      {
        snapshotDate: new Date('2026-04-27T00:00:00.000Z'),
        apy: '1.345600',
        dailyYield: 13456n,
        totalPrincipal: 1000000n,
        asset: 'XLM',
      },
    ]);

    const history = await service.getProjectYieldHistory('project-123', 2);

    expect(history).toEqual([
      {
        snapshotDate: '2026-04-26T00:00:00.000Z',
        apy: '1.234500',
        dailyYield: '12345',
        totalPrincipal: '1000000',
        asset: 'XLM',
      },
      {
        snapshotDate: '2026-04-27T00:00:00.000Z',
        apy: '1.345600',
        dailyYield: '13456',
        totalPrincipal: '1000000',
        asset: 'XLM',
      },
    ]);

    expect(prismaMock.yieldSnapshot.findMany).toHaveBeenCalledWith({
      where: { projectId: 'project-123' },
      orderBy: { snapshotDate: 'desc' },
      take: 2,
    });
  });

  it('slices trend data into 7, 30, and 90 day buckets', async () => {
    const mockedRows = Array.from({ length: 10 }, (_, index) => ({
      snapshotDate: new Date(Date.UTC(2026, 3, 18 + index)),
      apy: `${0.5 + index * 0.1}`,
      dailyYield: BigInt(1000 + index * 100),
      totalPrincipal: 1000000n,
      asset: 'XLM',
    })).reverse();

    prismaMock.yieldSnapshot.findMany.mockResolvedValue(mockedRows);
    const trend = await service.getProjectYieldTrends('project-123');

    expect(trend.last7Days.length).toBe(7);
    expect(trend.last30Days.length).toBe(10);
    expect(trend.last90Days.length).toBe(10);
  });
});
