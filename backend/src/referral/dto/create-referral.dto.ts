import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateReferralDto {
  @IsString()
  childId: string;

  @IsString()
  assessmentId: string;

  @IsString()
  fromFacilityId: string;

  @IsString()
  toFacilityId: string;

  @IsString()
  reason: string;

  @IsString()
  @IsOptional()
  urgency?: string; // "Emergency", "Urgent", "Routine"

  @IsString()
  @IsOptional()
  clinicalNotes?: string;

  @IsBoolean()
  @IsOptional()
  transportArranged?: boolean;
}
