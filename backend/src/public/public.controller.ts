// public.controller.ts

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
<<<<<<< feat/transaction-simulation
import { ProjectDto } from './dto/project.dto';
import { StatsDto } from './dto/stats.dto';
import { ProjectService } from '../project/project.service';
import { PrismaService } from '../prisma.service';
=======
import { CacheManagerService } from '../redis/cache-manager.service';
>>>>>>> main

@ApiTags('Public API')
@Controller('v1')
export class PublicController {
<<<<<<< feat/transaction-simulation
  constructor(
    private readonly projectService: ProjectService,
    private readonly prisma: PrismaService,
  ) {}
=======
  constructor(private readonly cacheManager: CacheManagerService) {}
>>>>>>> main

  /**
   * GET /v1/projects
   */
  @Get('projects')
  @ApiOperation({ summary: 'Get all public projects' })
<<<<<<< feat/transaction-simulation
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
=======
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
>>>>>>> main
  }

  /**
   * GET /v1/stats
   * Returns always-accurate global metrics with sub-10ms response time
   * via event-driven cache invalidation.
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get platform statistics' })
<<<<<<< feat/transaction-simulation
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
      totalFunding: totalFundingResult._sum.currentFunds || 0,
      activeUsers,
    };
=======
  @ApiResponse({ status: 200 })
  async getStats() {
    return this.cacheManager.getGlobalStats();
>>>>>>> main
  }
}
