import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/infra/db/prisma.service';

export type CreateNotificationInput = {
  userId: string;
  actorUserId?: string | null;
  type: NotificationType;
  entityType: string;
  entityId?: string | null;
  groupKey?: string | null;
  metadata: Prisma.InputJsonValue;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateNotificationInput) {
    const result = await this.prisma.$transaction(async (tx) => {
      const notification = await tx.notification.create({
        data: {
          userId: input.userId,
          actorUserId: input.actorUserId ?? null,
          type: input.type,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          groupKey: input.groupKey ?? null,
          metadata: input.metadata,
        },
      });

      await tx.notificationStat.upsert({
        where: { userId: input.userId },
        create: {
          userId: input.userId,
          unreadCount: 1,
        },
        update: {
          unreadCount: { increment: 1 },
        },
      });

      return notification;
    });

    return result;
  }

  async createMany(inputs: CreateNotificationInput[]) {
    if (inputs.length === 0) {
      return [];
    }

    return this.prisma.$transaction(async (tx) => {
      const created = [] as { id: string }[];
      const counter = new Map<string, number>();

      for (const input of inputs) {
        const notification = await tx.notification.create({
          data: {
            userId: input.userId,
            actorUserId: input.actorUserId ?? null,
            type: input.type,
            entityType: input.entityType,
            entityId: input.entityId ?? null,
            groupKey: input.groupKey ?? null,
            metadata: input.metadata,
          },
          select: { id: true },
        });
        created.push(notification);
        counter.set(input.userId, (counter.get(input.userId) ?? 0) + 1);
      }

      for (const [userId, count] of counter.entries()) {
        await tx.notificationStat.upsert({
          where: { userId },
          create: { userId, unreadCount: count },
          update: { unreadCount: { increment: count } },
        });
      }

      return created;
    });
  }

  async listForUser(userId: string, cursor?: string, limit = 20) {
    const items = await this.prisma.notification.findMany({
      where: { userId },
      include: {
        actorUser: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit,
    });

    return {
      items,
      nextCursor: items.length === limit ? items[items.length - 1].id : null,
    };
  }

  async groupedByDay(userId: string, limit = 50) {
    const items = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });

    const groups = new Map<string, typeof items>();
    for (const item of items) {
      const key = item.createdAt.toISOString().slice(0, 10);
      const current = groups.get(key) ?? [];
      current.push(item);
      groups.set(key, current);
    }

    return Array.from(groups.entries()).map(([date, notifications]) => ({
      date,
      notifications,
    }));
  }

  async unreadCount(userId: string) {
    const stat = await this.prisma.notificationStat.findUnique({ where: { userId } });
    if (stat) {
      return { unreadCount: stat.unreadCount };
    }

    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { unreadCount };
  }

  async markRead(userId: string, notificationId: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.notification.findFirst({
        where: { id: notificationId, userId },
      });

      if (!current) {
        throw new NotFoundException('Notification not found');
      }

      if (!current.isRead) {
        await tx.notification.update({
          where: { id: notificationId },
          data: {
            isRead: true,
            readAt: new Date(),
          },
        });

        const decremented = await tx.notificationStat.updateMany({
          where: { userId, unreadCount: { gt: 0 } },
          data: { unreadCount: { decrement: 1 } },
        });

        if (decremented.count === 0) {
          await tx.notificationStat.upsert({
            where: { userId },
            create: { userId, unreadCount: 0 },
            update: { unreadCount: 0 },
          });
        }
      }

      return { ok: true };
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });

      await tx.notificationStat.upsert({
        where: { userId },
        create: { userId, unreadCount: 0 },
        update: { unreadCount: 0 },
      });

      return { ok: true };
    });
  }
}
