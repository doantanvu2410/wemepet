import { IsArray, ArrayMinSize, IsEnum } from 'class-validator';
import { RoleCode } from '@prisma/client';

export class SetUserRolesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(RoleCode, { each: true })
  roles!: RoleCode[];
}
