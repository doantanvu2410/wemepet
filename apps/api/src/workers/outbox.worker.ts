import { OutboxStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function processBatch(batchSize = 50) {
  const events = await prisma.outboxEvent.findMany({
    where: {
      status: OutboxStatus.PENDING,
      availableAt: { lte: new Date() },
    },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
  });

  for (const event of events) {
    try {
      const claimed = await prisma.outboxEvent.updateMany({
        where: {
          id: event.id,
          status: OutboxStatus.PENDING,
        },
        data: {
          status: OutboxStatus.PROCESSING,
        },
      });

      if (claimed.count !== 1) {
        continue;
      }

      // Placeholder for external dispatch (WebSocket / queue / webhook).
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: OutboxStatus.PROCESSED,
          processedAt: new Date(),
        },
      });
    } catch (error) {
      const err = error as Error;
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: OutboxStatus.FAILED,
          retryCount: { increment: 1 },
          lastError: err.message,
          availableAt: new Date(Date.now() + 30_000),
        },
      });
    }
  }

  return events.length;
}

async function main() {
  while (true) {
    const handled = await processBatch();
    if (handled === 0) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
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
