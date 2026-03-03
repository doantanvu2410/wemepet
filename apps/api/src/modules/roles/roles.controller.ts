import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../shared/types/auth-user';
import { RolesService } from './roles.service';
import { SetUserRolesDto } from './dto/set-user-roles.dto';

@Controller('roles')
@UseGuards(AuthGuard, RolesGuard)
@Roles(RoleCode.ADMIN)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  listRoles() {
    return this.rolesService.listRoles();
  }

  @Patch('users/:userId')
  setUserRoles(
    @Param('userId') userId: string,
    @Body() dto: SetUserRolesDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.rolesService.setUserRoles(userId, dto.roles, user.id);
  }
}
