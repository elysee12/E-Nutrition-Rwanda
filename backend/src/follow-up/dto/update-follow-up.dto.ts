import { IsEnum, IsOptional, IsString } from 'class-validator';
import { FollowUpStatus } from '@prisma/client';

export class UpdateFollowUpDto {
  @IsEnum(FollowUpStatus)
  @IsOptional()
  status?: FollowUpStatus;

  @IsString()
  @IsOptional()
  outcome?: string;

  @IsString()
  @IsOptional()
  nextFollowUp?: string;
}
