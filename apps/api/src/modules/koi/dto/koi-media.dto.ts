import { IsEnum, IsInt, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';
import { MediaKind } from '@prisma/client';

export class KoiMediaDto {
  @IsEnum(MediaKind)
  kind!: MediaKind;

  @IsUrl()
  url!: string;

  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  sortOrder?: number;
}
