import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, MaxLength, Matches, IsPhoneNumber } from 'class-validator';
import { Sex } from '@prisma/client';

export class CreateChildDto {
  @IsString()
  @IsOptional()
  @MaxLength(30, { message: 'Application number cannot exceed 30 characters' })
  applicationNumber?: string;

  @IsString()
  @IsNotEmpty({ message: 'Child name is required' })
  @MinLength(2, { message: 'Child name must be at least 2 characters' })
  @MaxLength(100, { message: 'Child name cannot exceed 100 characters' })
  name!: string;

  @IsEnum(Sex, { message: 'Sex must be either M or F' })
  sex!: Sex;

  @IsDateString({}, { message: 'Date of birth must be a valid date' })
  dateOfBirth!: string;

  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Father name must be at least 2 characters' })
  @MaxLength(100, { message: 'Father name cannot exceed 100 characters' })
  fatherName?: string;

  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Mother name must be at least 2 characters' })
  @MaxLength(100, { message: 'Mother name cannot exceed 100 characters' })
  motherName?: string;

  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Caregiver name must be at least 2 characters' })
  @MaxLength(100, { message: 'Caregiver name cannot exceed 100 characters' })
  caregiverName?: string;

  @IsString()
  @IsOptional()
  @Matches(/^0\d{9}$/, { message: 'Phone number must be 10 digits (e.g., 0700000000)' })
  caregiverPhone?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{16}$/, { message: 'National ID must be exactly 16 digits' })
  caregiverNationalId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Additional info cannot exceed 500 characters' })
  otherInfo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Relationship cannot exceed 50 characters' })
  caregiverRelation?: string;

  @IsString()
  @IsNotEmpty({ message: 'Province is required' })
  @MinLength(2, { message: 'Province name must be at least 2 characters' })
  province!: string;

  @IsString()
  @IsNotEmpty({ message: 'District is required' })
  @MinLength(2, { message: 'District name must be at least 2 characters' })
  district!: string;

  @IsString()
  @IsNotEmpty({ message: 'Sector is required' })
  @MinLength(2, { message: 'Sector name must be at least 2 characters' })
  sector!: string;

  @IsString()
  @IsNotEmpty({ message: 'Cell is required' })
  @MinLength(2, { message: 'Cell name must be at least 2 characters' })
  cell!: string;

  @IsString()
  @IsNotEmpty({ message: 'Village is required' })
  @MinLength(2, { message: 'Village name must be at least 2 characters' })
  village!: string;

  @IsString()
  @IsOptional()
  facilityId?: string;

  @IsString()
  @IsOptional()
  assignedCHWId?: string; // Optional manual CHW assignment
}
