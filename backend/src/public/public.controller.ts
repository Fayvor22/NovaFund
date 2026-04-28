// public.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
// TODO: Create DTO files
// import { ProjectDto } from './dto/project.dto';
// import { StatsDto } from './dto/stats.dto';
import { ProjectService } from '../project/project.service';
import { PrismaService } from '../prisma.service';
import { CacheManagerService } from '../redis/cache-manager.service';

interface ProjectDto {
  id: string;
  name: string;
  description: string;
  fundingGoal: bigint;
  fundsRaised: bigint;
}

interface StatsDto {
  totalProjects: number;
  totalFunding: bigint;
  activeUsers: number;
}

const DEFAULT_PROJECT_LIMIT = 20;

@ApiTags('Public API')
@Controller('v1')
export class PublicController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly prisma: PrismaService,
    private readonly cacheManager: CacheManagerService,
  ) {}

  /**
   * GET /v1/projects
   */
  @Get('projects')
  @ApiOperation({ summary: 'Get all public projects' })
  async getProjects(): Promise<any[]> {
    const projects = await this.projectService.findActiveProjects(DEFAULT_PROJECT_LIMIT);
    return projects.map(project => ({
      id: project.id,
      name: project.title,
      description: project.description,
      fundingGoal: project.goal.toString(),
      fundsRaised: project.currentFunds.toString(),
    }));
  }

  /**
   * GET /v1/stats
   * Returns global metrics with cache-first strategy and DB fallback.
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get platform statistics' })
  async getStats(): Promise<any> {
    const cached = await this.cacheManager.getGlobalStats();
    if (cached) return cached;
    return this.computeStatsFromDb();
  }

  private async computeStatsFromDb(): Promise<any> {
    const [totalProjects, totalFundingResult, activeUsers] = await Promise.all([
      this.prisma.project.count(),
      this.prisma.project.aggregate({
        _sum: { currentFunds: true },
      }),
      this.prisma.user.count({
        where: {
          OR: [
            { contributions: { some: {} } },
            { createdProjects: { some: {} } },
          ],
        },
      }),
    ]);

    return {
      totalProjects,
      totalFunding: (totalFundingResult._sum.currentFunds ?? 0n).toString(),
      activeUsers,
    };
  }
}