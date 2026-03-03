import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { KoiStatus } from '@prisma/client';

export class ListKoiDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(KoiStatus)
  status?: KoiStatus;

  @IsOptional()
  @IsString()
  ownerUserId?: string;
}
