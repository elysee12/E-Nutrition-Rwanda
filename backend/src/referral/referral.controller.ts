import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { CreateReferralDto } from './dto/create-referral.dto';
import { UpdateReferralDto } from './dto/update-referral.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('referrals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Post()
  @Roles('ADMIN', 'DATA_MANAGER', 'NURSE')
  create(@Body() createReferralDto: CreateReferralDto, @CurrentUser() user: any) {
    return this.referralService.create(createReferralDto, user.id);
  }

  @Get()
  @Roles('ADMIN', 'DATA_MANAGER', 'NURSE')
  findAll(@Query() query: any) {
    return this.referralService.findAll(query);
  }

  @Get(':id')
  @Roles('ADMIN', 'DATA_MANAGER', 'NURSE')
  findOne(@Param('id') id: string) {
    return this.referralService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'DATA_MANAGER', 'NURSE')
  update(@Param('id') id: string, @Body() updateReferralDto: UpdateReferralDto) {
    return this.referralService.update(id, updateReferralDto);
  }

  @Patch(':id/accept')
  @Roles('ADMIN', 'DATA_MANAGER', 'NURSE')
  acceptReferral(@Param('id') id: string) {
    return this.referralService.acceptReferral(id);
  }

  @Patch(':id/complete')
  @Roles('ADMIN', 'DATA_MANAGER', 'NURSE')
  completeReferral(@Param('id') id: string, @Body() body: { outcome: string }) {
    return this.referralService.completeReferral(id, body.outcome);
  }

  @Delete(':id')
  @Roles('ADMIN', 'DATA_MANAGER')
  remove(@Param('id') id: string) {
    return this.referralService.remove(id);
  }
}
