import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, Prisma, TransferStatus } from '@prisma/client';
import { PrismaService } from '../../shared/infra/db/prisma.service';
import { sanitizePlainText } from '../../shared/utils/text-sanitize';
import { RequestTransferDto } from './dto/request-transfer.dto';
import { ListTransfersDto } from './dto/list-transfers.dto';

@Injectable()
export class TransfersService {
  constructor(private readonly prisma: PrismaService) {}

  async request(actorId: string, dto: RequestTransferDto) {
    const expiresAt = dto.expiresInHours
      ? new Date(Date.now() + dto.expiresInHours * 60 * 60 * 1000)
      : null;

    return this.prisma.$transaction(
      async (tx) => {
        if (dto.toUserId === actorId) {
          throw new BadRequestException('Cannot transfer to self');
        }

        if (dto.idempotencyKey) {
          const existing = await tx.transfer.findFirst({
            where: {
              idempotencyKey: dto.idempotencyKey,
              fromUserId: actorId,
              koiId: dto.koiId,
            },
          });
          if (existing) {
            return existing;
          }
        }

        const koi = await tx.koi.findFirst({
          where: { id: dto.koiId, deletedAt: null },
          select: {
            id: true,
            ownerUserId: true,
            isTransferLocked: true,
            lockVersion: true,
          },
        });

        if (!koi) {
          throw new NotFoundException('Koi not found');
        }

        if (koi.ownerUserId !== actorId) {
          throw new ForbiddenException('Only owner can request transfer');
        }

        if (koi.isTransferLocked) {
          throw new ConflictException('Koi is currently locked for transfer');
        }

        const targetUser = await tx.user.findFirst({
          where: { id: dto.toUserId, deletedAt: null },
          select: { id: true },
        });

        if (!targetUser) {
          throw new NotFoundException('Target user not found');
        }

        const pending = await tx.transfer.findFirst({
          where: {
            koiId: dto.koiId,
            status: TransferStatus.PENDING,
          },
          select: { id: true },
        });

        if (pending) {
          throw new ConflictException('There is already a pending transfer');
        }

        const lockResult = await tx.koi.updateMany({
          where: {
            id: koi.id,
            lockVersion: koi.lockVersion,
            isTransferLocked: false,
          },
          data: {
            isTransferLocked: true,
            lockVersion: { increment: 1 },
          },
        });

        if (lockResult.count !== 1) {
          throw new ConflictException('Transfer conflict, retry request');
        }

        const transfer = await tx.transfer.create({
          data: {
            koiId: dto.koiId,
            fromUserId: actorId,
            toUserId: dto.toUserId,
            note: sanitizePlainText(dto.note),
            expiresAt,
            status: TransferStatus.PENDING,
            idempotencyKey: dto.idempotencyKey,
          },
        });

        await tx.notification.create({
          data: {
            userId: dto.toUserId,
            actorUserId: actorId,
            type: NotificationType.TRANSFER_REQUEST,
            entityType: 'transfer',
            entityId: transfer.id,
            groupKey: `transfer:${dto.koiId}`,
            metadata: {
              transferId: transfer.id,
              koiId: dto.koiId,
            } as Prisma.InputJsonValue,
          },
        });

        await tx.notificationStat.upsert({
          where: { userId: dto.toUserId },
          create: { userId: dto.toUserId, unreadCount: 1 },
          update: { unreadCount: { increment: 1 } },
        });

        await tx.outboxEvent.create({
          data: {
            eventType: 'transfer.requested',
            aggregateType: 'transfer',
            aggregateId: transfer.id,
            payload: {
              transferId: transfer.id,
              koiId: dto.koiId,
              fromUserId: actorId,
              toUserId: dto.toUserId,
            } as Prisma.InputJsonValue,
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: actorId,
            action: 'transfer.request',
            entityType: 'transfer',
            entityId: transfer.id,
            metadata: {
              koiId: dto.koiId,
              toUserId: dto.toUserId,
            } as Prisma.InputJsonValue,
          },
        });

        return transfer;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async incoming(userId: string, query: ListTransfersDto) {
    const limit = query.limit ?? 20;
    const items = await this.prisma.transfer.findMany({
      where: {
        toUserId: userId,
        ...(query.status ? { status: query.status } : { status: TransferStatus.PENDING }),
      },
      include: {
        koi: {
          select: {
            id: true,
            name: true,
            status: true,
            ownerUserId: true,
          },
        },
        fromUser: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      take: limit,
    });

    return {
      items,
      nextCursor: items.length === limit ? items[items.length - 1].id : null,
    };
  }

  async history(userId: string, query: ListTransfersDto) {
    const limit = query.limit ?? 20;
    const items = await this.prisma.transfer.findMany({
      where: {
        OR: [{ fromUserId: userId }, { toUserId: userId }],
        ...(query.status ? { status: query.status } : {}),
      },
      include: {
        koi: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        fromUser: { select: { id: true, displayName: true } },
        toUser: { select: { id: true, displayName: true } },
      },
      orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      take: limit,
    });

    return {
      items,
      nextCursor: items.length === limit ? items[items.length - 1].id : null,
    };
  }

  async accept(transferId: string, actorId: string, reason?: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const transfer = await tx.transfer.findUnique({
          where: { id: transferId },
          include: { koi: true },
        });

        if (!transfer) {
          throw new NotFoundException('Transfer not found');
        }

        if (transfer.toUserId !== actorId) {
          throw new ForbiddenException('Only receiver can accept transfer');
        }

        if (transfer.status !== TransferStatus.PENDING) {
          throw new ConflictException('Transfer is not pending');
        }

        if (transfer.expiresAt && transfer.expiresAt.getTime() < Date.now()) {
          await tx.transfer.update({
            where: { id: transferId },
            data: {
              status: TransferStatus.EXPIRED,
              decidedAt: new Date(),
              reason: 'expired',
            },
          });

          await tx.koi.updateMany({
            where: { id: transfer.koiId, isTransferLocked: true },
            data: {
              isTransferLocked: false,
              lockVersion: { increment: 1 },
            },
          });

          throw new ConflictException('Transfer has expired');
        }

        const updateTransfer = await tx.transfer.updateMany({
          where: {
            id: transferId,
            status: TransferStatus.PENDING,
            toUserId: actorId,
          },
          data: {
            status: TransferStatus.ACCEPTED,
            decidedAt: new Date(),
            reason: sanitizePlainText(reason),
          },
        });

        if (updateTransfer.count !== 1) {
          throw new ConflictException('Transfer was already handled');
        }

        const updateKoi = await tx.koi.updateMany({
          where: {
            id: transfer.koiId,
            ownerUserId: transfer.fromUserId,
            isTransferLocked: true,
          },
          data: {
            ownerUserId: actorId,
            isTransferLocked: false,
            lockVersion: { increment: 1 },
          },
        });

        if (updateKoi.count !== 1) {
          throw new ConflictException('Koi ownership conflict');
        }

        await tx.notification.create({
          data: {
            userId: transfer.fromUserId,
            actorUserId: actorId,
            type: NotificationType.TRANSFER_ACCEPTED,
            entityType: 'transfer',
            entityId: transferId,
            groupKey: `transfer:${transfer.koiId}`,
            metadata: {
              transferId,
              koiId: transfer.koiId,
            } as Prisma.InputJsonValue,
          },
        });

        await tx.notificationStat.upsert({
          where: { userId: transfer.fromUserId },
          create: { userId: transfer.fromUserId, unreadCount: 1 },
          update: { unreadCount: { increment: 1 } },
        });

        await tx.outboxEvent.create({
          data: {
            eventType: 'transfer.accepted',
            aggregateType: 'transfer',
            aggregateId: transferId,
            payload: {
              transferId,
              koiId: transfer.koiId,
              fromUserId: transfer.fromUserId,
              toUserId: actorId,
            } as Prisma.InputJsonValue,
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: actorId,
            action: 'transfer.accept',
            entityType: 'transfer',
            entityId: transferId,
            metadata: {
              koiId: transfer.koiId,
              fromUserId: transfer.fromUserId,
              toUserId: actorId,
            } as Prisma.InputJsonValue,
          },
        });

        return tx.transfer.findUnique({
          where: { id: transferId },
          include: {
            koi: true,
            fromUser: { select: { id: true, displayName: true } },
            toUser: { select: { id: true, displayName: true } },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async reject(transferId: string, actorId: string, reason?: string) {
    return this.handleDecision(transferId, actorId, TransferStatus.REJECTED, reason);
  }

  async cancel(transferId: string, actorId: string, reason?: string) {
    return this.handleDecision(transferId, actorId, TransferStatus.CANCELLED, reason);
  }

  private async handleDecision(
    transferId: string,
    actorId: string,
    status: TransferStatus,
    reason?: string,
  ) {
    const isReject = status === TransferStatus.REJECTED;

    return this.prisma.$transaction(
      async (tx) => {
        const transfer = await tx.transfer.findUnique({
          where: { id: transferId },
        });

        if (!transfer) {
          throw new NotFoundException('Transfer not found');
        }

        if (transfer.status !== TransferStatus.PENDING) {
          throw new ConflictException('Transfer is not pending');
        }

        if (isReject && transfer.toUserId !== actorId) {
          throw new ForbiddenException('Only receiver can reject transfer');
        }

        if (!isReject && transfer.fromUserId !== actorId) {
          throw new ForbiddenException('Only sender can cancel transfer');
        }

        const updateResult = await tx.transfer.updateMany({
          where: {
            id: transferId,
            status: TransferStatus.PENDING,
          },
          data: {
            status,
            decidedAt: new Date(),
            cancelledAt: isReject ? null : new Date(),
            reason: sanitizePlainText(reason),
          },
        });

        if (updateResult.count !== 1) {
          throw new ConflictException('Transfer was already handled');
        }

        await tx.koi.updateMany({
          where: {
            id: transfer.koiId,
            isTransferLocked: true,
          },
          data: {
            isTransferLocked: false,
            lockVersion: { increment: 1 },
          },
        });

        const notifyUserId = isReject ? transfer.fromUserId : transfer.toUserId;
        const notifyType = isReject
          ? NotificationType.TRANSFER_REJECTED
          : NotificationType.SYSTEM;

        await tx.notification.create({
          data: {
            userId: notifyUserId,
            actorUserId: actorId,
            type: notifyType,
            entityType: 'transfer',
            entityId: transferId,
            groupKey: `transfer:${transfer.koiId}`,
            metadata: {
              transferId,
              koiId: transfer.koiId,
              status,
              reason,
            } as Prisma.InputJsonValue,
          },
        });

        await tx.notificationStat.upsert({
          where: { userId: notifyUserId },
          create: { userId: notifyUserId, unreadCount: 1 },
          update: { unreadCount: { increment: 1 } },
        });

        await tx.outboxEvent.create({
          data: {
            eventType: isReject ? 'transfer.rejected' : 'transfer.cancelled',
            aggregateType: 'transfer',
            aggregateId: transferId,
            payload: {
              transferId,
              koiId: transfer.koiId,
              fromUserId: transfer.fromUserId,
              toUserId: transfer.toUserId,
              status,
              reason,
            } as Prisma.InputJsonValue,
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: actorId,
            action: isReject ? 'transfer.reject' : 'transfer.cancel',
            entityType: 'transfer',
            entityId: transferId,
            metadata: {
              koiId: transfer.koiId,
              status,
              reason,
            } as Prisma.InputJsonValue,
          },
        });

        return tx.transfer.findUnique({
          where: { id: transferId },
          include: {
            koi: true,
            fromUser: { select: { id: true, displayName: true } },
            toUser: { select: { id: true, displayName: true } },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async forceExpirePending() {
    const now = new Date();
    const expired = await this.prisma.transfer.findMany({
      where: {
        status: TransferStatus.PENDING,
        expiresAt: { lt: now },
      },
      select: { id: true, koiId: true },
    });

    for (const item of expired) {
      await this.prisma.$transaction(async (tx) => {
        await tx.transfer.updateMany({
          where: { id: item.id, status: TransferStatus.PENDING },
          data: {
            status: TransferStatus.EXPIRED,
            decidedAt: new Date(),
            reason: 'expired',
          },
        });

        await tx.koi.updateMany({
          where: { id: item.koiId, isTransferLocked: true },
          data: {
            isTransferLocked: false,
            lockVersion: { increment: 1 },
          },
        });
      });
    }

    return { expired: expired.length };
  }
}
