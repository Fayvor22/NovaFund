// public.controller.ts

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProjectDto } from './dto/project.dto';
import { StatsDto } from './dto/stats.dto';
import { ProjectService } from '../project/project.service';
import { PrismaService } from '../prisma.service';

@ApiTags('Public API')
@Controller('v1')
export class PublicController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /v1/projects
   */
  @Get('projects')
  @ApiOperation({ summary: 'Get all public projects' })
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
  }

  /**
   * GET /v1/stats
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get platform statistics' })
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
  }
}