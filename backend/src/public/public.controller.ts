import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProjectDto } from './dto/project.dto';
import { StatsDto } from './dto/stats.dto';
import { ProjectService } from '../project/project.service';
import { PrismaService } from '../prisma.service';
import { CacheManagerService } from '../redis/cache-manager.service';


const DEFAULT_PROJECT_LIMIT = 20;

@ApiTags('Public API')
@Controller('v1')
export class PublicController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly prisma: PrismaService,
    private readonly cacheManager: CacheManagerService,
  ) {}
 
  constructor(private readonly cacheManager: CacheManagerService) {}


  /**
   * GET /v1/projects
   */
  @Get('projects')
  @ApiOperation({ summary: 'Get all public projects' })
  @ApiResponse({ status: 200, type: [ProjectDto] })
  async getProjects(): Promise<ProjectDto[]> {
    const projects = await this.projectService.findActiveProjects(DEFAULT_PROJECT_LIMIT);
  @ApiResponse({ status: 200, type: [ProjectDto] })
  async getProjects(): Promise<ProjectDto[]> {
    const projects = await this.projectService.findActiveProjects(20);
    return projects.map(project => ({
      id: project.id,
      name: project.title,
      description: project.description,
      fundingGoal: project.goal,
      fundsRaised: project.currentFunds,
    }));
  @ApiResponse({ status: 200 })
  async getProjects() {
    // TODO: Replace with real service
    return [
      {
        id: '1',
        name: 'NovaFund Alpha',
        description: 'Decentralized funding platform',
        fundingGoal: 10000,
        fundsRaised: 7500,
      },
    ];

  }

  /**
   * GET /v1/stats
   * Returns global metrics with cache-first strategy and DB fallback.
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get platform statistics' })
  @ApiResponse({ status: 200, type: StatsDto })
  async getStats(): Promise<StatsDto> {
    const cached = await this.cacheManager.getGlobalStats();
    if (cached) return cached;
    return this.computeStatsFromDb();
  }

  private async computeStatsFromDb(): Promise<StatsDto> {
    const [totalProjects, totalFunds] = await Promise.all([
      this.prisma.project.count(),
      this.prisma.project.aggregate({ _sum: { currentFunds: true } }),
  @ApiResponse({ status: 200, type: StatsDto })
  async getStats(): Promise<StatsDto> {
    const [totalProjects, totalFundingResult, activeUsers] = await Promise.all([
      this.prisma.project.count(),
      this.prisma.project.aggregate({
        _sum: { currentFunds: true },
      }),
      this.prisma.user.count({
        where: {
          OR: [
            { contributions: { some: {} } },
            { projects: { some: {} } },
          ],
        },
      }),
    ]);

    return {
      totalProjects,
      totalFundsRaised: totalFunds._sum.currentFunds ?? 0,
    };
      totalFunding: totalFundingResult._sum.currentFunds || 0,
      activeUsers,
    };
  @ApiResponse({ status: 200 })
  async getStats() {
    return this.cacheManager.getGlobalStats();

  }
}