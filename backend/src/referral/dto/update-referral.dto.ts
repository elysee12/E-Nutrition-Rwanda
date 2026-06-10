import { PartialType } from '@nestjs/mapped-types';
import { CreateReferralDto } from './create-referral.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReferralStatus } from '@prisma/client';

export class UpdateReferralDto extends PartialType(CreateReferralDto) {
  @IsEnum(ReferralStatus)
  @IsOptional()
  status?: ReferralStatus;

  @IsString()
  @IsOptional()
  outcome?: string;
}
