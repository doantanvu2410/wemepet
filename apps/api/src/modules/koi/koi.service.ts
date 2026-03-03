import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { KoiStatus, PostKind, PostStatus, Prisma, RoleCode, Visibility } from '@prisma/client';
import { PrismaService } from '../../shared/infra/db/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../../shared/types/auth-user';
import { sanitizePlainText } from '../../shared/utils/text-sanitize';
import { CreateKoiDto } from './dto/create-koi.dto';
import { ListKoiDto } from './dto/list-koi.dto';
import { UpdateKoiDto } from './dto/update-koi.dto';

@Injectable()
export class KoiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(ownerId: string, dto: CreateKoiDto) {
    const koi = await this.prisma.$transaction(async (tx) => {
      const created = await tx.koi.create({
        data: {
          ownerUserId: ownerId,
          name: dto.name,
          variety: dto.variety,
          gender: dto.gender,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
          sizeCm: dto.sizeCm,
          description: sanitizePlainText(dto.description),
          lineage: sanitizePlainText(dto.lineage),
          certificateCode: dto.certificateCode,
          status: KoiStatus.PENDING,
        },
      });

      if (dto.media?.length) {
        await tx.koiMedia.createMany({
          data: dto.media.map((item, index) => ({
            koiId: created.id,
            kind: item.kind,
            url: item.url,
            thumbnailUrl: item.thumbnailUrl,
            sortOrder: item.sortOrder ?? index,
          })),
        });
      }

      if (dto.publishToFeed) {
        await tx.post.create({
          data: {
            authorId: ownerId,
            kind: PostKind.KOI_PROFILE,
            status: PostStatus.ACTIVE,
            visibility: Visibility.PUBLIC,
            bodyText: sanitizePlainText(dto.description),
            koiId: created.id,
          },
        });
      }

      return created;
    });

    await this.auditService.log({
      actorUserId: ownerId,
      action: 'koi.create',
      entityType: 'koi',
      entityId: koi.id,
      afterState: {
        name: koi.name,
        status: koi.status,
      },
    });

    return this.detail(koi.id);
  }

  async list(query: ListKoiDto) {
    const where: Prisma.KoiWhereInput = {
      deletedAt: null,
      status: query.status ?? KoiStatus.APPROVED,
      ...(query.ownerUserId ? { ownerUserId: query.ownerUserId } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { variety: { contains: query.q, mode: 'insensitive' } },
              { certificateCode: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const limit = query.limit ?? 20;
    const rows = await this.prisma.koi.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        media: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      take: limit,
    });

    return {
      items: rows,
      nextCursor: rows.length === limit ? rows[rows.length - 1].id : null,
    };
  }

  async detail(koiId: string) {
    const koi = await this.prisma.koi.findFirst({
      where: { id: koiId, deletedAt: null },
      include: {
        owner: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        media: {
          orderBy: { sortOrder: 'asc' },
        },
        profilePost: {
          select: { id: true, publishedAt: true },
        },
      },
    });

    if (!koi) {
      throw new NotFoundException('Koi not found');
    }

    return koi;
  }

  async update(koiId: string, actor: AuthUser, dto: UpdateKoiDto) {
    const current = await this.prisma.koi.findFirst({
      where: { id: koiId, deletedAt: null },
      include: { media: true },
    });

    if (!current) {
      throw new NotFoundException('Koi not found');
    }

    const isAdmin = actor.roles.includes(RoleCode.ADMIN) || actor.roles.includes(RoleCode.MODERATOR);
    if (current.ownerUserId !== actor.id && !isAdmin) {
      throw new ForbiddenException('Cannot edit this koi');
    }

    const updateData: Prisma.KoiUncheckedUpdateInput = {
      name: dto.name,
      variety: dto.variety,
      gender: dto.gender,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      sizeCm: dto.sizeCm,
      description: sanitizePlainText(dto.description),
      lineage: sanitizePlainText(dto.lineage),
      certificateCode: dto.certificateCode,
    };

    if (!isAdmin) {
      updateData.status = KoiStatus.PENDING;
      updateData.approvedByUserId = null;
      updateData.approvedAt = null;
      updateData.rejectedReason = null;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.koi.update({
        where: { id: koiId },
        data: updateData,
      });

      if (dto.media) {
        await tx.koiMedia.deleteMany({ where: { koiId } });
        if (dto.media.length > 0) {
          await tx.koiMedia.createMany({
            data: dto.media.map((item, index) => ({
              koiId,
              kind: item.kind,
              url: item.url,
              thumbnailUrl: item.thumbnailUrl,
              sortOrder: item.sortOrder ?? index,
            })),
          });
        }
      }

      return row;
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'koi.update',
      entityType: 'koi',
      entityId: koiId,
      beforeState: {
        name: current.name,
        status: current.status,
      },
      afterState: {
        name: updated.name,
        status: updated.status,
      },
    });

    return this.detail(koiId);
  }

  async remove(koiId: string, actor: AuthUser) {
    const current = await this.prisma.koi.findFirst({
      where: { id: koiId, deletedAt: null },
    });

    if (!current) {
      throw new NotFoundException('Koi not found');
    }

    const isAdmin = actor.roles.includes(RoleCode.ADMIN);
    if (current.ownerUserId !== actor.id && !isAdmin) {
      throw new ForbiddenException('Cannot delete this koi');
    }

    await this.prisma.koi.update({
      where: { id: koiId },
      data: {
        deletedAt: new Date(),
        status: KoiStatus.ARCHIVED,
      },
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'koi.delete',
      entityType: 'koi',
      entityId: koiId,
    });

    return { ok: true };
  }
}
