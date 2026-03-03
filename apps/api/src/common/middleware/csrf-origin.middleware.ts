import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfOriginMiddleware implements NestMiddleware {
  use(req: FastifyRequest, _res: FastifyReply, next: () => void) {
    if (SAFE_METHODS.has(req.method.toUpperCase())) {
      next();
      return;
    }

    const allowed = (process.env.CORS_ORIGIN ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (allowed.length === 0) {
      next();
      return;
    }

    const origin = req.headers.origin;
    if (!origin || !allowed.includes(origin)) {
      throw new ForbiddenException('Invalid request origin');
    }

    next();
  }
}
