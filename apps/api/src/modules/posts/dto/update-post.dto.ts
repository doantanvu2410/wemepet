import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Visibility } from '@prisma/client';
import { PostMediaDto } from './post-media.dto';

export class UpdatePostDto {
  @IsString()
  @MaxLength(10000)
  @IsOptional()
  bodyText?: string;

  @IsEnum(Visibility)
  @IsOptional()
  visibility?: Visibility;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PostMediaDto)
  media?: PostMediaDto[];
}
