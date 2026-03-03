import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ModerateKoiDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
