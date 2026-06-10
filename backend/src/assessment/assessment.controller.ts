import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { AssessmentService } from './assessment.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('assessments')
@UseGuards(JwtAuthGuard)
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  @Post()
  create(@Body() createAssessmentDto: CreateAssessmentDto, @CurrentUser() user: any) {
    return this.assessmentService.create(createAssessmentDto, user.id);
  }

  @Get()
  findAll(@Query() query: any, @CurrentUser() user: any) {
    return this.assessmentService.findAll(query, user.id);
  }

  @Get('pending')
  getPending() {
    return this.assessmentService.getPending();
  }

  @Get('critical')
  getCritical() {
    return this.assessmentService.getCritical();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assessmentService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAssessmentDto: UpdateAssessmentDto,
    @CurrentUser() user: any,
  ) {
    return this.assessmentService.update(id, updateAssessmentDto, user.id);
  }

  @Patch(':id/review')
  review(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.assessmentService.reviewAssessment(id, user.id);
  }
}
