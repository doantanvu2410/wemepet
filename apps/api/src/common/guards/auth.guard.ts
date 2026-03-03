import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { createRemoteJWKSet, JWTPayload, jwtVerify } from 'jose';
import { PrismaService } from '../../shared/infra/db/prisma.service';
import { AuthUser } from '../../shared/types/auth-user';

@Injectable()
export class AuthGuard implements CanActivate {
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization as string | undefined;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authHeader.substring('Bearer '.length);
    const jwksUrl = process.env.AUTH_JWKS_URL;
    const issuer = process.env.AUTH_ISSUER;
    const audience = process.env.AUTH_AUDIENCE;

    if (!jwksUrl || !issuer || !audience) {
      throw new UnauthorizedException('Auth provider is not configured');
    }

    const jwks = this.getJwks(jwksUrl);

    let payload: JWTPayload;
    try {
      const verified = await jwtVerify(token, jwks, {
        issuer,
        audience,
      });
      payload = verified.payload;
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }

    const user = await this.resolveUser(payload);
    request.user = user;
    return true;
  }

  private getJwks(jwksUrl: string) {
    if (!this.jwks) {
      this.jwks = createRemoteJWKSet(new URL(jwksUrl));
    }

    return this.jwks;
  }

  private async resolveUser(payload: JWTPayload): Promise<AuthUser> {
    const subject = payload.sub;
    if (!subject) {
      throw new UnauthorizedException('Invalid token subject');
    }

    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : null;
    const name = typeof payload.name === 'string' ? payload.name : 'User';

    const dbUser = await this.prisma.user.upsert({
      where: { authSubject: subject },
      create: {
        authSubject: subject,
        email: email ?? `${subject}@placeholder.local`,
        displayName: name,
        lastLoginAt: new Date(),
      },
      update: {
        email: email ?? undefined,
        displayName: name,
        lastLoginAt: new Date(),
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (dbUser.roles.length === 0) {
      const defaultRole = await this.prisma.role.findUnique({ where: { code: RoleCode.USER } });
      if (defaultRole) {
        await this.prisma.userRole.upsert({
          where: {
            userId_roleId: {
              userId: dbUser.id,
              roleId: defaultRole.id,
            },
          },
          create: {
            userId: dbUser.id,
            roleId: defaultRole.id,
          },
          update: {},
        });
      }
    }

    const userWithRoles = await this.prisma.user.findUnique({
      where: { id: dbUser.id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!userWithRoles) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: userWithRoles.id,
      subject,
      email: userWithRoles.email,
      roles: userWithRoles.roles.map((item) => item.role.code),
    };
  }
}
