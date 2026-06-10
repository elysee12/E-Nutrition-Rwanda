import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('activities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @Roles('ADMIN', 'DATA_MANAGER')
  findAll(@Query() query: any, @CurrentUser() user: any) {
    return this.activityService.findAll(query, user);
  }

  @Get('stats')
  @Roles('ADMIN', 'DATA_MANAGER')
  getStats(@Query() query: any, @CurrentUser() user: any) {
    return this.activityService.getActivityStats(query, user);
  }

  @Get('user/:userId')
  @Roles('ADMIN', 'DATA_MANAGER')
  findByUser(@Param('userId') userId: string, @Query() query: any) {
    return this.activityService.findByUser(userId, query);
  }

  @Get('facility/:facilityId')
  @Roles('ADMIN', 'DATA_MANAGER')
  findByFacility(@Param('facilityId') facilityId: string, @Query() query: any) {
    return this.activityService.findByFacility(facilityId, query);
  }

  @Get(':id')
  @Roles('ADMIN', 'DATA_MANAGER')
  findOne(@Param('id') id: string) {
    return this.activityService.findOne(id);
  }
}
