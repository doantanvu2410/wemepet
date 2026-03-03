import { MediaKind } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsUrl, Max, Min } from 'class-validator';

export class PostMediaDto {
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
