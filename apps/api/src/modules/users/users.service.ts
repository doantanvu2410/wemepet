import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/infra/db/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { roles: { include: { role: true } } },
    });
  }

  byId(id: string) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { roles: { include: { role: true } } },
    });
  }

  updateProfile(id: string, payload: { displayName?: string; avatarUrl?: string; bio?: string }) {
    return this.prisma.user.update({
      where: { id },
      data: {
        displayName: payload.displayName,
        avatarUrl: payload.avatarUrl,
        bio: payload.bio,
      },
    });
  }
}
