import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { FollowUpService } from './follow-up.service';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { UpdateFollowUpDto } from './dto/update-follow-up.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('follow-ups')
@UseGuards(JwtAuthGuard)
export class FollowUpController {
  constructor(private readonly followUpService: FollowUpService) {}

  @Post()
  create(@Body() createFollowUpDto: CreateFollowUpDto, @CurrentUser() user: any) {
    return this.followUpService.create(createFollowUpDto, user.id);
  }

  @Get()
  findAll(@Query() query: any, @CurrentUser() user: any) {
    return this.followUpService.findAll(query, user?.id);
  }

  @Get('today')
  getToday(@CurrentUser() user: any) {
    return this.followUpService.getToday(user?.id);
  }

  @Get('upcoming')
  getUpcoming(@CurrentUser() user: any) {
    return this.followUpService.getUpcoming(user?.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.followUpService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateFollowUpDto: UpdateFollowUpDto,
    @CurrentUser() user: any,
  ) {
    return this.followUpService.update(id, updateFollowUpDto, user.id);
  }
}
