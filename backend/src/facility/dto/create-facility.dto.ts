import { IsString, IsEnum, IsOptional, IsInt, IsEmail, MinLength, MaxLength, Matches, IsNotEmpty, Min } from 'class-validator';
import { FacilityType } from '@prisma/client';

export class CreateFacilityDto {
  @IsString()
  @IsNotEmpty({ message: 'Facility name is required' })
  @MinLength(3, { message: 'Facility name must be at least 3 characters' })
  @MaxLength(150, { message: 'Facility name cannot exceed 150 characters' })
  name: string;

  @IsEnum(FacilityType, { message: 'Invalid facility type' })
  type: FacilityType;

  @IsString()
  @IsNotEmpty({ message: 'Province is required' })
  @MinLength(2, { message: 'Province name must be at least 2 characters' })
  province: string;

  @IsString()
  @IsNotEmpty({ message: 'District is required' })
  @MinLength(2, { message: 'District name must be at least 2 characters' })
  district: string;

  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Sector name must be at least 2 characters' })
  sector?: string;

  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Director name must be at least 2 characters' })
  @MaxLength(100, { message: 'Director name cannot exceed 100 characters' })
  directorName?: string;

  @IsString()
  @IsOptional()
  @Matches(/^0\d{9}$/, { message: 'Phone number must be 10 digits (e.g., 0700000000)' })
  facilityPhone?: string;

  @IsEmail({}, { message: 'Valid email address is required' })
  @IsOptional()
  facilityEmail?: string;

  @IsInt({ message: 'Staff count must be a whole number' })
  @IsOptional()
  @Min(0, { message: 'Staff count cannot be negative' })
  staffCount?: number;

  @IsInt({ message: 'Children count must be a whole number' })
  @IsOptional()
  @Min(0, { message: 'Children count cannot be negative' })
  childrenCount?: number;
}
