import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { AuthUser } from '../../shared/types/auth-user';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { ListPostsDto } from './dto/list-posts.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  feed(@Query() query: ListPostsDto) {
    return this.postsService.feed(query.cursor, query.limit ?? 20);
  }

  @Get(':postId')
  detail(@Param('postId') postId: string) {
    return this.postsService.detail(postId);
  }

  @UseGuards(AuthGuard)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePostDto) {
    return this.postsService.create(user.id, dto);
  }

  @UseGuards(AuthGuard)
  @Patch(':postId')
  update(@Param('postId') postId: string, @CurrentUser() user: AuthUser, @Body() dto: UpdatePostDto) {
    return this.postsService.update(postId, user.id, dto);
  }

  @UseGuards(AuthGuard)
  @Delete(':postId')
  softDelete(@Param('postId') postId: string, @CurrentUser() user: AuthUser) {
    return this.postsService.softDelete(postId, user.id);
  }

  @UseGuards(AuthGuard)
  @Post(':postId/likes/toggle')
  toggleLike(@Param('postId') postId: string, @CurrentUser() user: AuthUser) {
    return this.postsService.toggleLike(postId, user.id);
  }

  @UseGuards(AuthGuard)
  @Post(':postId/bookmarks/toggle')
  toggleBookmark(@Param('postId') postId: string, @CurrentUser() user: AuthUser) {
    return this.postsService.toggleBookmark(postId, user.id);
  }

  @UseGuards(AuthGuard)
  @Post(':postId/comments')
  addComment(@Param('postId') postId: string, @CurrentUser() user: AuthUser, @Body() dto: CreateCommentDto) {
    return this.postsService.addComment(postId, user.id, dto);
  }
}
