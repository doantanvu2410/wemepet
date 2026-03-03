import { Injectable, NotFoundException } from '@nestjs/common';
import { KoiStatus, NotificationType, PostStatus, Prisma, RoleCode, TransferStatus } from '@prisma/client';
import { PrismaService } from '../../shared/infra/db/prisma.service';
import { RolesService } from '../roles/roles.service';
import { AuditService } from '../audit/audit.service';
import { sanitizePlainText } from '../../shared/utils/text-sanitize';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rolesService: RolesService,
    private readonly auditService: AuditService,
  ) {}

  pendingKoi() {
    return this.prisma.koi.findMany({
      where: { status: KoiStatus.PENDING, deletedAt: null },
      include: {
        owner: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            email: true,
          },
        },
        media: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveKoi(koiId: string, adminUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const koi = await tx.koi.findFirst({ where: { id: koiId, deletedAt: null } });
      if (!koi) {
        throw new NotFoundException('Koi not found');
      }

      const updated = await tx.koi.update({
        where: { id: koiId },
        data: {
          status: KoiStatus.APPROVED,
          approvedByUserId: adminUserId,
          approvedAt: new Date(),
          rejectedReason: null,
        },
      });

      await tx.notification.create({
        data: {
          userId: koi.ownerUserId,
          actorUserId: adminUserId,
          type: NotificationType.KOI_APPROVED,
          entityType: 'koi',
          entityId: koiId,
          groupKey: `koi:${koiId}`,
          metadata: {
            koiId,
            status: updated.status,
          } as Prisma.InputJsonValue,
        },
      });

      await tx.notificationStat.upsert({
        where: { userId: koi.ownerUserId },
        create: { userId: koi.ownerUserId, unreadCount: 1 },
        update: { unreadCount: { increment: 1 } },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: adminUserId,
          action: 'admin.koi.approve',
          entityType: 'koi',
          entityId: koiId,
          metadata: {
            ownerUserId: koi.ownerUserId,
          } as Prisma.InputJsonValue,
          beforeState: {
            status: koi.status,
          } as Prisma.InputJsonValue,
          afterState: {
            status: KoiStatus.APPROVED,
          } as Prisma.InputJsonValue,
        },
      });

      return updated;
    });
  }

  async rejectKoi(koiId: string, adminUserId: string, reason?: string) {
    const sanitizedReason = sanitizePlainText(reason) ?? 'Rejected by moderation';

    return this.prisma.$transaction(async (tx) => {
      const koi = await tx.koi.findFirst({ where: { id: koiId, deletedAt: null } });
      if (!koi) {
        throw new NotFoundException('Koi not found');
      }

      const updated = await tx.koi.update({
        where: { id: koiId },
        data: {
          status: KoiStatus.REJECTED,
          approvedByUserId: adminUserId,
          approvedAt: null,
          rejectedReason: sanitizedReason,
        },
      });

      await tx.notification.create({
        data: {
          userId: koi.ownerUserId,
          actorUserId: adminUserId,
          type: NotificationType.KOI_REJECTED,
          entityType: 'koi',
          entityId: koiId,
          groupKey: `koi:${koiId}`,
          metadata: {
            koiId,
            reason: sanitizedReason,
          } as Prisma.InputJsonValue,
        },
      });

      await tx.notificationStat.upsert({
        where: { userId: koi.ownerUserId },
        create: { userId: koi.ownerUserId, unreadCount: 1 },
        update: { unreadCount: { increment: 1 } },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: adminUserId,
          action: 'admin.koi.reject',
          entityType: 'koi',
          entityId: koiId,
          metadata: {
            ownerUserId: koi.ownerUserId,
            reason: sanitizedReason,
          } as Prisma.InputJsonValue,
          beforeState: {
            status: koi.status,
          } as Prisma.InputJsonValue,
          afterState: {
            status: KoiStatus.REJECTED,
          } as Prisma.InputJsonValue,
        },
      });

      return updated;
    });
  }

  async removePost(postId: string, adminUserId: string) {
    const post = await this.prisma.post.findFirst({ where: { id: postId, deletedAt: null } });
    if (!post) {
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
      actorUserId: adminUserId,
      action: 'admin.post.delete',
      entityType: 'post',
      entityId: postId,
      beforeState: {
        status: post.status,
      },
      afterState: {
        status: PostStatus.DELETED,
      },
    });

    return { ok: true };
  }

  setUserRoles(userId: string, roles: RoleCode[], adminUserId: string) {
    return this.rolesService.setUserRoles(userId, roles, adminUserId);
  }

  listTransfers(status?: TransferStatus) {
    return this.prisma.transfer.findMany({
      where: status ? { status } : undefined,
      include: {
        koi: { select: { id: true, name: true, status: true } },
        fromUser: { select: { id: true, displayName: true, email: true } },
        toUser: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
  }

  listAuditLogs(limit = 100) {
    return this.prisma.auditLog.findMany({
      include: {
        actorUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
