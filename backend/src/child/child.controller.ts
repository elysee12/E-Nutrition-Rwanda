import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ChildService } from './child.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('children')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChildController {
  constructor(private readonly childService: ChildService) {}

  @Post()
  create(@Body() createChildDto: CreateChildDto, @CurrentUser() user: any) {
    return this.childService.create(createChildDto, user);
  }

  @Get()
  findAll(@Query() query: any, @CurrentUser() user: any) {
    return this.childService.findAll(query, user);
  }

  // Must be before ':id' to avoid route conflict
  @Get('chws/:facilityId')
  getCHWsByFacility(@Param('facilityId') facilityId: string) {
    return this.childService.getCHWsByFacility(facilityId);
  }

  // Search children by name (for autocomplete)
  @Get('search/:query')
  searchChildren(@Param('query') query: string, @CurrentUser() user: any) {
    return this.childService.searchChildren(query, user);
  }

  // Lookup by application number — for auto-populate
  @Get('by-app-number/:appNumber')
  findByApplicationNumber(@Param('appNumber') appNumber: string) {
    return this.childService.findByApplicationNumber(appNumber);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.childService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateChildDto: UpdateChildDto,
    @CurrentUser() user: any,
  ) {
    return this.childService.update(id, updateChildDto, user);
  }

  @Get(':id/assessments')
  getAssessments(@Param('id') id: string) {
    return this.childService.getAssessments(id);
  }

  @Get(':id/growth-chart')
  getGrowthChart(@Param('id') id: string) {
    return this.childService.getGrowthChart(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.DATA_MANAGER)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.childService.remove(id, user);
  }
}
