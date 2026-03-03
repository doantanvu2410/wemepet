import { Injectable } from '@nestjs/common';
import { Prisma, ActorType } from '@prisma/client';
import { PrismaService } from '../../shared/infra/db/prisma.service';

export type AuditLogInput = {
  actorUserId?: string | null;
  actorType?: ActorType;
  action: string;
  entityType: string;
  entityId?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue;
  beforeState?: Prisma.InputJsonValue;
  afterState?: Prisma.InputJsonValue;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput) {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        actorType: input.actorType ?? ActorType.USER,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        requestId: input.requestId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        metadata: input.metadata,
        beforeState: input.beforeState,
        afterState: input.afterState,
      },
    });
  }
}
