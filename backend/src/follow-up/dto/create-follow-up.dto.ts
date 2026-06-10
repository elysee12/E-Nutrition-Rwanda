import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFollowUpDto {
  @IsString()
  @IsNotEmpty()
  childId: string;

  @IsString()
  @IsOptional()
  assessmentId?: string;

  @IsDateString()
  scheduledDate: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
