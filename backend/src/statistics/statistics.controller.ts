import { Controller, Get, UseGuards, Param, Query } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  // Public endpoint for global stats (no auth required)
  @Get('global')
  getGlobalStats() {
    return this.statisticsService.getGlobalStats();
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  getDashboard(@CurrentUser() user: any) {
    return this.statisticsService.getDashboardStats(user);
  }

  @Get('facility/:id')
  @UseGuards(JwtAuthGuard)
  getFacilityStats(@Param('id') id: string, @Query() query: any) {
    return this.statisticsService.getFacilityStats(id, query);
  }

  @Get('chw/:id')
  @UseGuards(JwtAuthGuard)
  getCHWStats(@Param('id') id: string, @Query() query: any) {
    return this.statisticsService.getCHWStats(id, query);
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  getAnalytics(@Query() query: any, @CurrentUser() user: any) {
    return this.statisticsService.getAnalytics(query, user);
  }
}
