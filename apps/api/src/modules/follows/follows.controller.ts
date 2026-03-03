import { Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { AuthUser } from '../../shared/types/auth-user';
import { FollowsService } from './follows.service';

@Controller('follows')
@UseGuards(AuthGuard)
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Post(':userId')
  follow(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.followsService.follow(user.id, userId);
  }

  @Delete(':userId')
  unfollow(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.followsService.unfollow(user.id, userId);
  }
}
