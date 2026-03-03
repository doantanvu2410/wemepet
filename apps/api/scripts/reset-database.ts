import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.notificationStat.deleteMany(),
    prisma.outboxEvent.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.transfer.deleteMany(),
    prisma.koiMedia.deleteMany(),
    prisma.koi.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.like.deleteMany(),
    prisma.bookmark.deleteMany(),
    prisma.postMedia.deleteMany(),
    prisma.post.deleteMany(),
    prisma.follow.deleteMany(),
    prisma.mediaUploadIntent.deleteMany(),
    prisma.userRole.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // eslint-disable-next-line no-console
  console.log('Database hard reset completed (roles preserved).');
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
