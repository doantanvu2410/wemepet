import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class RequestTransferDto {
  @IsUUID()
  koiId!: string;

  @IsUUID()
  toUserId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(168)
  expiresInHours?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string;
}
