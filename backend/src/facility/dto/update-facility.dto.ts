import { PartialType } from '@nestjs/mapped-types';
import { CreateFacilityDto } from './create-facility.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { FacilityStatus } from '@prisma/client';

export class UpdateFacilityDto extends PartialType(CreateFacilityDto) {
  @IsEnum(FacilityStatus)
  @IsOptional()
  status?: FacilityStatus;
}
