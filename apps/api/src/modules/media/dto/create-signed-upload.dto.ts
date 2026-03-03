import { UploadTarget } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateSignedUploadDto {
  @IsEnum(UploadTarget)
  target!: UploadTarget;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  targetId?: string;

  @IsString()
  @MaxLength(255)
  fileName!: string;

  @IsString()
  @MaxLength(120)
  mimeType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500 * 1024 * 1024)
  sizeBytes!: number;
}
