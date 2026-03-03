import { PrismaClient, RoleCode } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const roles = [
    { code: RoleCode.USER, name: 'User', description: 'Default product user role' },
    { code: RoleCode.MODERATOR, name: 'Moderator', description: 'Content moderation role' },
    { code: RoleCode.ADMIN, name: 'Admin', description: 'System administrator role' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      create: role,
      update: {
        name: role.name,
        description: role.description,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('Roles seeded');
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
