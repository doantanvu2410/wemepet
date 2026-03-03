import { Module } from '@nestjs/common';
import { PrismaModule } from '../shared/infra/db/prisma.module';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [PrismaModule],
  providers: [AuthGuard, RolesGuard],
  exports: [AuthGuard, RolesGuard],
})
export class CommonModule {}
