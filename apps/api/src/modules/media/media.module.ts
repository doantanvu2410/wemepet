import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { PrismaModule } from '../../shared/infra/db/prisma.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
