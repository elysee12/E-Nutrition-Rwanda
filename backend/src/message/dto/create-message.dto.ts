import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  recipientId: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsArray()
  attachments?: string[];
}
