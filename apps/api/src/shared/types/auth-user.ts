import { RoleCode } from '@prisma/client';

export type AuthUser = {
  id: string;
  subject: string;
  email: string;
  roles: RoleCode[];
};
