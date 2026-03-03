import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RoleCode, TransferStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../shared/types/auth-user';
import { SetUserRolesDto } from '../roles/dto/set-user-roles.dto';
import { ModerateKoiDto } from './dto/moderate-koi.dto';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('koi/pending')
  pendingKoi() {
    return this.adminService.pendingKoi();
  }

  @Post('koi/:koiId/approve')
  approveKoi(@Param('koiId') koiId: string, @CurrentUser() user: AuthUser) {
    return this.adminService.approveKoi(koiId, user.id);
  }

  @Post('koi/:koiId/reject')
  rejectKoi(
    @Param('koiId') koiId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ModerateKoiDto,
  ) {
    return this.adminService.rejectKoi(koiId, user.id, dto.reason);
  }

  @Delete('posts/:postId')
  removePost(@Param('postId') postId: string, @CurrentUser() user: AuthUser) {
    return this.adminService.removePost(postId, user.id);
  }

  @Patch('users/:userId/roles')
  @Roles(RoleCode.ADMIN)
  setUserRoles(
    @Param('userId') userId: string,
    @Body() dto: SetUserRolesDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.setUserRoles(userId, dto.roles, user.id);
  }

  @Get('transfers')
  listTransfers(@Query('status') status?: TransferStatus) {
    return this.adminService.listTransfers(status);
  }

  @Get('audit-logs')
  listAuditLogs(@Query('limit') limit?: string) {
    return this.adminService.listAuditLogs(Number(limit) || 100);
  }
}
