import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { FacilityService } from './facility.service';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('facilities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FacilityController {
  constructor(private readonly facilityService: FacilityService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() createFacilityDto: CreateFacilityDto) {
    return this.facilityService.create(createFacilityDto);
  }

  @Get()
  @Roles('ADMIN', 'DATA_MANAGER')
  findAll(@Query() query: any, @CurrentUser() user: any) {
    return this.facilityService.findAll(query, user);
  }

  @Get(':id')
  @Roles('ADMIN', 'DATA_MANAGER')
  findOne(@Param('id') id: string) {
    return this.facilityService.findOne(id);
  }

  @Get(':id/stats')
  @Roles('ADMIN', 'DATA_MANAGER')
  getStats(@Param('id') id: string) {
    return this.facilityService.getStats(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() updateFacilityDto: UpdateFacilityDto) {
    return this.facilityService.update(id, updateFacilityDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.facilityService.remove(id);
  }
}
