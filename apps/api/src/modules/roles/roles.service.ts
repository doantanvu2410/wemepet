import { Injectable, NotFoundException } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { PrismaService } from '../../shared/infra/db/prisma.service';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  listRoles() {
    return this.prisma.role.findMany({ orderBy: { code: 'asc' } });
  }

  async setUserRoles(userId: string, roles: RoleCode[], assignedBy?: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roleRows = await this.prisma.role.findMany({
      where: { code: { in: roles } },
      select: { id: true, code: true },
    });

    if (roleRows.length !== roles.length) {
      throw new NotFoundException('One or more roles not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId } });
      await tx.userRole.createMany({
        data: roleRows.map((row) => ({
          userId,
          roleId: row.id,
          assignedBy: assignedBy ?? null,
        })),
      });
    });

    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
  }
}
