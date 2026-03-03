import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthGuard } from '../../common/guards/auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../shared/types/auth-user';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.usersService.byId(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() body: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, body);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  list() {
    return this.usersService.list();
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.usersService.byId(id);
  }
}
