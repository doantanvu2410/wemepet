import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { AuthUser } from '../../shared/types/auth-user';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListNotificationsDto) {
    return this.notificationsService.listForUser(user.id, query.cursor, query.limit ?? 20);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.notificationsService.unreadCount(user.id);
  }

  @Get('grouped')
  grouped(@CurrentUser() user: AuthUser, @Query('limit') limit?: string) {
    return this.notificationsService.groupedByDay(user.id, Number(limit) || 50);
  }

  @Post(':notificationId/read')
  markRead(@CurrentUser() user: AuthUser, @Param('notificationId') notificationId: string) {
    return this.notificationsService.markRead(user.id, notificationId);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllRead(user.id);
  }
}
