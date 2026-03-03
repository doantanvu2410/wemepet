import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthModule } from '../modules/auth/auth.module';
import { UsersModule } from '../modules/users/users.module';
import { PostsModule } from '../modules/posts/posts.module';
import { FollowsModule } from '../modules/follows/follows.module';
import { KoiModule } from '../modules/koi/koi.module';
import { TransfersModule } from '../modules/transfers/transfers.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { AdminModule } from '../modules/admin/admin.module';
import { RolesModule } from '../modules/roles/roles.module';
import { AuditModule } from '../modules/audit/audit.module';
import { MediaModule } from '../modules/media/media.module';
import { PrismaModule } from '../shared/infra/db/prisma.module';
import { CacheModule } from '../shared/infra/cache/cache.module';
import { CsrfOriginMiddleware } from '../common/middleware/csrf-origin.middleware';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    AuditModule,
    RolesModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    PostsModule,
    FollowsModule,
    KoiModule,
    TransfersModule,
    AdminModule,
    MediaModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CsrfOriginMiddleware).forRoutes('*');
  }
}
