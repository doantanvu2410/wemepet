import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/infra/db/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class FollowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  async follow(followerId: string, followeeId: string) {
    if (followerId === followeeId) {
      return { ok: false, reason: 'cannot_follow_self' };
    }

    const followee = await this.prisma.user.findFirst({
      where: { id: followeeId, deletedAt: null },
      select: { id: true },
    });

    if (!followee) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.follow.upsert({
      where: {
        followerId_followeeId: {
          followerId,
          followeeId,
        },
      },
      create: {
        followerId,
        followeeId,
      },
      update: {},
    });

    if (followerId !== followeeId) {
      await this.notificationsService.create({
        userId: followeeId,
        actorUserId: followerId,
        type: NotificationType.FOLLOW,
        entityType: 'follow',
        entityId: followeeId,
        groupKey: `follow:${followeeId}`,
        metadata: {
          followerId,
          followeeId,
        } as Prisma.InputJsonValue,
      });
    }

    await this.auditService.log({
      actorUserId: followerId,
      action: 'follow.create',
      entityType: 'follow',
      entityId: `${followerId}:${followeeId}`,
    });

    return { ok: true };
  }

  async unfollow(followerId: string, followeeId: string) {
    await this.prisma.follow.deleteMany({
      where: {
        followerId,
        followeeId,
      },
    });

    await this.auditService.log({
      actorUserId: followerId,
      action: 'follow.delete',
      entityType: 'follow',
      entityId: `${followerId}:${followeeId}`,
    });

    return { ok: true };
  }
}
