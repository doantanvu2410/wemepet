import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PostKind, Visibility } from '@prisma/client';
import { PostMediaDto } from './post-media.dto';

export class CreatePostDto {
  @IsString()
  @MaxLength(10000)
  @IsOptional()
  bodyText?: string;

  @IsEnum(PostKind)
  @IsOptional()
  kind?: PostKind;

  @IsEnum(Visibility)
  @IsOptional()
  visibility?: Visibility;

  @IsOptional()
  @IsUUID()
  koiId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PostMediaDto)
  media?: PostMediaDto[];
}
