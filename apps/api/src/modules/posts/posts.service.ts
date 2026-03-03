import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, PostKind, PostStatus, Prisma, Visibility } from '@prisma/client';
import { PrismaService } from '../../shared/infra/db/prisma.service';
import { sanitizePlainText } from '../../shared/utils/text-sanitize';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  async create(authorId: string, dto: CreatePostDto) {
    const sanitizedBody = sanitizePlainText(dto.bodyText);
    if (!sanitizedBody && !dto.media?.length && !dto.koiId) {
      throw new BadRequestException('Post content is empty');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: {
          authorId,
          bodyText: sanitizedBody,
          kind: dto.kind ?? PostKind.STATUS,
          visibility: dto.visibility ?? Visibility.PUBLIC,
          koiId: dto.koiId,
        },
      });

      if (dto.media?.length) {
        await tx.postMedia.createMany({
          data: dto.media.map((item, index) => ({
            postId: post.id,
            kind: item.kind,
            url: item.url,
            thumbnailUrl: item.thumbnailUrl,
            sortOrder: item.sortOrder ?? index,
          })),
        });
      }

      return post;
    });

    await this.auditService.log({
      actorUserId: authorId,
      action: 'post.create',
      entityType: 'post',
      entityId: created.id,
      metadata: {
        kind: created.kind,
      },
    });

    return this.detail(created.id);
  }

  async feed(cursor?: string, limit = 20) {
    const rows = await this.prisma.post.findMany({
      where: {
        status: PostStatus.ACTIVE,
        deletedAt: null,
        visibility: Visibility.PUBLIC,
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        media: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit,
    });

    return {
      items: rows,
      nextCursor: rows.length === limit ? rows[rows.length - 1].id : null,
    };
  }

  async detail(postId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        media: { orderBy: { sortOrder: 'asc' } },
        comments: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  async update(postId: string, actorId: string, dto: UpdatePostDto) {
    const post = await this.prisma.post.findFirst({ where: { id: postId, deletedAt: null } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.authorId !== actorId) {
      throw new NotFoundException('Post not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.post.update({
        where: { id: postId },
        data: {
          bodyText: sanitizePlainText(dto.bodyText),
          visibility: dto.visibility,
        },
      });

      if (dto.media) {
        await tx.postMedia.deleteMany({ where: { postId } });
        if (dto.media.length > 0) {
          await tx.postMedia.createMany({
            data: dto.media.map((item, index) => ({
              postId,
              kind: item.kind,
              url: item.url,
              thumbnailUrl: item.thumbnailUrl,
              sortOrder: item.sortOrder ?? index,
            })),
          });
        }
      }
    });

    await this.auditService.log({
      actorUserId: actorId,
      action: 'post.update',
      entityType: 'post',
      entityId: postId,
    });

    return this.detail(postId);
  }

  async softDelete(postId: string, actorId: string) {
    const post = await this.prisma.post.findFirst({ where: { id: postId, deletedAt: null } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.authorId !== actorId) {
      throw new NotFoundException('Post not found');
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: {
        status: PostStatus.DELETED,
        deletedAt: new Date(),
      },
    });

    await this.auditService.log({
      actorUserId: actorId,
      action: 'post.delete',
      entityType: 'post',
      entityId: postId,
    });

    return { ok: true };
  }

  async toggleLike(postId: string, actorId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true, authorId: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const existing = await this.prisma.like.findUnique({
      where: { userId_postId: { userId: actorId, postId } },
    });

    if (existing) {
      await this.prisma.$transaction([
        this.prisma.like.delete({ where: { userId_postId: { userId: actorId, postId } } }),
        this.prisma.post.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      return { liked: false };
    }

    await this.prisma.$transaction([
      this.prisma.like.create({ data: { userId: actorId, postId } }),
      this.prisma.post.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      }),
    ]);

    if (post.authorId !== actorId) {
      await this.notificationsService.create({
        userId: post.authorId,
        actorUserId: actorId,
        type: NotificationType.POST_LIKE,
        entityType: 'post',
        entityId: postId,
        groupKey: `post_like:${postId}`,
        metadata: {
          postId,
        } as Prisma.InputJsonValue,
      });
    }

    return { liked: true };
  }

  async toggleBookmark(postId: string, actorId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const existing = await this.prisma.bookmark.findUnique({
      where: { userId_postId: { userId: actorId, postId } },
    });

    if (existing) {
      await this.prisma.$transaction([
        this.prisma.bookmark.delete({
          where: { userId_postId: { userId: actorId, postId } },
        }),
        this.prisma.post.update({
          where: { id: postId },
          data: { bookmarkCount: { decrement: 1 } },
        }),
      ]);
      return { bookmarked: false };
    }

    await this.prisma.$transaction([
      this.prisma.bookmark.create({ data: { userId: actorId, postId } }),
      this.prisma.post.update({
        where: { id: postId },
        data: { bookmarkCount: { increment: 1 } },
      }),
    ]);

    return { bookmarked: true };
  }

  async addComment(postId: string, actorId: string, dto: CreateCommentDto) {
    const sanitizedComment = sanitizePlainText(dto.body);
    if (!sanitizedComment) {
      throw new BadRequestException('Comment content is empty');
    }

    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true, authorId: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let depth = 0;
      let rootCommentId: string | null = null;
      let parentAuthorId: string | null = null;

      if (dto.parentCommentId) {
        const parent = await tx.comment.findUnique({
          where: { id: dto.parentCommentId },
          select: {
            id: true,
            postId: true,
            depth: true,
            rootCommentId: true,
            authorId: true,
          },
        });

        if (!parent || parent.postId !== postId) {
          throw new NotFoundException('Parent comment not found');
        }

        depth = parent.depth + 1;
        rootCommentId = parent.rootCommentId ?? parent.id;
        parentAuthorId = parent.authorId;

        await tx.comment.update({
          where: { id: parent.id },
          data: {
            replyCount: { increment: 1 },
          },
        });
      }

      const comment = await tx.comment.create({
        data: {
          postId,
          authorId: actorId,
          body: sanitizedComment,
          parentCommentId: dto.parentCommentId ?? null,
          rootCommentId,
          depth,
        },
      });

      await tx.post.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      });

      return {
        comment,
        parentAuthorId,
      };
    });

    const notifications: Promise<unknown>[] = [];

    if (post.authorId !== actorId) {
      notifications.push(
        this.notificationsService.create({
          userId: post.authorId,
          actorUserId: actorId,
          type: NotificationType.POST_COMMENT,
          entityType: 'post',
          entityId: postId,
          groupKey: `post_comment:${postId}`,
          metadata: {
            postId,
            commentId: result.comment.id,
          } as Prisma.InputJsonValue,
        }),
      );
    }

    if (result.parentAuthorId && result.parentAuthorId !== actorId && result.parentAuthorId !== post.authorId) {
      notifications.push(
        this.notificationsService.create({
          userId: result.parentAuthorId,
          actorUserId: actorId,
          type: NotificationType.COMMENT_REPLY,
          entityType: 'comment',
          entityId: result.comment.id,
          groupKey: `comment_reply:${postId}`,
          metadata: {
            postId,
            commentId: result.comment.id,
            parentCommentId: dto.parentCommentId,
          } as Prisma.InputJsonValue,
        }),
      );
    }

    if (notifications.length > 0) {
      await Promise.all(notifications);
    }

    await this.auditService.log({
      actorUserId: actorId,
      action: 'comment.create',
      entityType: 'comment',
      entityId: result.comment.id,
      metadata: {
        postId,
      },
    });

    return result.comment;
  }
}
