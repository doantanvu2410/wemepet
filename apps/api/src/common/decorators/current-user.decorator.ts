import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../../shared/types/auth-user';

export const CurrentUser = createParamDecorator((_, ctx: ExecutionContext): AuthUser | null => {
  const request = ctx.switchToHttp().getRequest();
  return (request.user as AuthUser | undefined) ?? null;
});
