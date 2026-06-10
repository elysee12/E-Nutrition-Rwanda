import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateAssessmentDto {
  @IsString()
  @IsNotEmpty()
  childId: string;

  @IsString()
  @IsNotEmpty()
  facilityId: string;

  @IsNumber()
  @Min(2, { message: 'Weight must be at least 2 kg' })
  @Max(30, { message: 'Weight cannot exceed 30 kg' })
  weightKg: number;

  @IsNumber()
  @Min(40, { message: 'Height must be at least 40 cm' })
  @Max(130, { message: 'Height cannot exceed 130 cm' })
  heightCm: number;

  @IsNumber()
  @IsOptional()
  @Min(5, { message: 'MUAC must be at least 5 cm' })
  @Max(20, { message: 'MUAC cannot exceed 20 cm' })
  muacCm?: number;

  @IsBoolean()
  @IsOptional()
  hasOedema?: boolean;

  @IsString()
  @IsOptional()
  clinicalNotes?: string;
}
