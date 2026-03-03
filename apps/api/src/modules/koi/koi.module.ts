import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { PrismaModule } from '../../shared/infra/db/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { KoiController } from './koi.controller';
import { KoiService } from './koi.service';

@Module({
  imports: [PrismaModule, CommonModule, AuditModule],
  controllers: [KoiController],
  providers: [KoiService],
  exports: [KoiService],
})
export class KoiModule {}
