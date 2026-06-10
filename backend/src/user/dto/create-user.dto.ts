import { IsString, IsEmail, IsEnum, IsOptional, MinLength, MaxLength, Matches, IsNotEmpty } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  name: string;

  @IsEmail({}, { message: 'Valid email address is required' })
  email: string;

  @IsString()
  @IsOptional()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(255, { message: 'Password cannot exceed 255 characters' })
  password?: string;

  @IsString()
  @IsOptional()
  @Matches(/^0\d{9}$/, { message: 'Phone number must be 10 digits (e.g., 0700000000)' })
  phone?: string;

  @IsEnum(UserRole, { message: 'Invalid user role' })
  role: UserRole;

  @IsString()
  @IsOptional()
  facilityId?: string;

  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Province name must be at least 2 characters' })
  province?: string;

  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'District name must be at least 2 characters' })
  district?: string;

  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Sector name must be at least 2 characters' })
  sector?: string;

  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Cell name must be at least 2 characters' })
  cell?: string;

  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Village name must be at least 2 characters' })
  village?: string;
}
