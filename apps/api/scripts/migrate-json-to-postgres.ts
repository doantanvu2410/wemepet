import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  KoiStatus,
  MediaKind,
  NotificationType,
  Prisma,
  PostKind,
  PostStatus,
  PrismaClient,
  RoleCode,
  TransferStatus,
  Visibility,
} from '@prisma/client';

type JsonValue = null | boolean | number | string | JsonValue[] | { [k: string]: JsonValue };

const prisma = new PrismaClient();

function readJson(filePath: string): JsonValue {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf8').trim();
  if (!content) {
    return [];
  }

  try {
    return JSON.parse(content) as JsonValue;
  } catch {
    return [];
  }
}

function toArray<T = Record<string, unknown>>(value: JsonValue): T[] {
  if (Array.isArray(value)) {
    return value as unknown as T[];
  }
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap((item) => (Array.isArray(item) ? item : [])) as T[];
  }
  return [];
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return {};
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeStatus(value: unknown): TransferStatus {
  const raw = String(value ?? '').toUpperCase();
  if (raw === 'ACCEPTED') return TransferStatus.ACCEPTED;
  if (raw === 'REJECTED') return TransferStatus.REJECTED;
  if (raw === 'CANCELLED') return TransferStatus.CANCELLED;
  if (raw === 'EXPIRED') return TransferStatus.EXPIRED;
  return TransferStatus.PENDING;
}

function maybeDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function maybeUuid(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    return value;
  }
  return undefined;
}

async function ensureUserRole() {
  const role = await prisma.role.findUnique({ where: { code: RoleCode.USER } });
  if (!role) {
    throw new Error('Role USER is missing. Run migration first.');
  }
  return role.id;
}

async function migrate() {
  const root = path.resolve(process.cwd(), '..', '..');
  const legacyDir = process.env.LEGACY_JSON_DIR
    ? path.resolve(process.env.LEGACY_JSON_DIR)
    : path.resolve(root, 'legacy-data');

  const usersRaw = toArray(readJson(path.resolve(legacyDir, 'users.json')));
  const postsRaw = toArray(readJson(path.resolve(legacyDir, 'posts.json')));
  const transactionsRaw = toArray(readJson(path.resolve(legacyDir, 'transactions.json')));
  const notificationsRaw = toArray(readJson(path.resolve(legacyDir, 'notifications.json')));
  const dataRaw = readJson(path.resolve(legacyDir, 'data.json'));

  const userRoleId = await ensureUserRole();
  const userIdMap = new Map<string, string>();

  for (const rawRow of usersRaw) {
    const row = asObject(rawRow);
    const legacyId =
      asString(row.id) ?? asString(row.uid) ?? asString(row.userId) ?? asString(row.email) ?? randomUUID();
    const uuid = maybeUuid(asString(row.id)) ?? randomUUID();
    const email = asString(row.email) ?? `${legacyId}@legacy.local`;

    await prisma.user.upsert({
      where: { email },
      create: {
        id: uuid,
        authSubject: asString(row.authSubject) ?? `legacy:${legacyId}`,
        email,
        displayName: asString(row.displayName) ?? asString(row.name) ?? email.split('@')[0] ?? 'Legacy User',
        avatarUrl: asString(row.avatarUrl),
        bio: asString(row.bio),
      },
      update: {
        displayName: asString(row.displayName) ?? asString(row.name) ?? undefined,
        avatarUrl: asString(row.avatarUrl),
        bio: asString(row.bio),
      },
    });

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (user) {
      userIdMap.set(legacyId, user.id);
      if (asString(row.id)) {
        userIdMap.set(asString(row.id)!, user.id);
      }
      if (asString(row.uid)) {
        userIdMap.set(asString(row.uid)!, user.id);
      }

      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: userRoleId,
          },
        },
        create: {
          userId: user.id,
          roleId: userRoleId,
        },
        update: {},
      });
    }
  }

  const postIdMap = new Map<string, string>();

  for (const rawRow of postsRaw) {
    const row = asObject(rawRow);
    const legacyPostId = asString(row.id) ?? randomUUID();
    const authorLegacyId = asString(row.authorId) ?? asString(row.userId) ?? asString(row.ownerId);
    const authorId = authorLegacyId ? userIdMap.get(authorLegacyId) : undefined;

    if (!authorId) {
      continue;
    }

    const postId = maybeUuid(asString(row.id)) ?? randomUUID();
    postIdMap.set(legacyPostId, postId);

    await prisma.post.upsert({
      where: { id: postId },
      create: {
        id: postId,
        authorId,
        kind: PostKind.STATUS,
        status: PostStatus.ACTIVE,
        visibility: Visibility.PUBLIC,
        bodyText: asString(row.bodyText) ?? asString(row.content) ?? asString(row.text),
        publishedAt: maybeDate(row.createdAt) ?? new Date(),
      },
      update: {
        bodyText: asString(row.bodyText) ?? asString(row.content) ?? asString(row.text),
      },
    });

    const imageUrl = asString(row.imageUrl) ?? asString(row.image);
    const videoUrl = asString(row.videoUrl) ?? asString(row.video);

    if (imageUrl) {
      await prisma.postMedia.create({
        data: {
          postId,
          kind: MediaKind.IMAGE,
          url: imageUrl,
          sortOrder: 0,
        },
      });
    }

    if (videoUrl) {
      await prisma.postMedia.create({
        data: {
          postId,
          kind: MediaKind.VIDEO,
          url: videoUrl,
          sortOrder: 1,
        },
      });
    }
  }

  const dataObj = asObject(dataRaw);
  const koiSources = [
    ...toArray(dataObj.koi as JsonValue),
    ...toArray(dataObj.kois as JsonValue),
    ...toArray(dataObj.koiRegistry as JsonValue),
  ];

  const koiIdMap = new Map<string, string>();
  for (const rawRow of koiSources) {
    const row = asObject(rawRow);
    const legacyKoiId = asString(row.id) ?? randomUUID();
    const ownerLegacyId = asString(row.ownerUserId) ?? asString(row.ownerId) ?? asString(row.userId);
    const ownerUserId = ownerLegacyId ? userIdMap.get(ownerLegacyId) : undefined;
    if (!ownerUserId) {
      continue;
    }

    const koiId = maybeUuid(asString(row.id)) ?? randomUUID();
    koiIdMap.set(legacyKoiId, koiId);

    await prisma.koi.upsert({
      where: { id: koiId },
      create: {
        id: koiId,
        ownerUserId,
        name: asString(row.name) ?? 'Legacy Koi',
        variety: asString(row.variety),
        gender: asString(row.gender),
        description: asString(row.description),
        lineage: asString(row.lineage),
        certificateCode: asString(row.certificateCode) ?? asString(row.certificate),
        status: KoiStatus.PENDING,
      },
      update: {
        name: asString(row.name) ?? undefined,
        variety: asString(row.variety),
        gender: asString(row.gender),
        description: asString(row.description),
        lineage: asString(row.lineage),
      },
    });
  }

  for (const rawRow of transactionsRaw) {
    const row = asObject(rawRow);
    const legacyKoiId = asString(row.koiId);
    const fromLegacyId = asString(row.fromUserId) ?? asString(row.from);
    const toLegacyId = asString(row.toUserId) ?? asString(row.to);

    const koiId = legacyKoiId ? koiIdMap.get(legacyKoiId) : undefined;
    const fromUserId = fromLegacyId ? userIdMap.get(fromLegacyId) : undefined;
    const toUserId = toLegacyId ? userIdMap.get(toLegacyId) : undefined;

    if (!koiId || !fromUserId || !toUserId) {
      continue;
    }

    await prisma.transfer.create({
      data: {
        koiId,
        fromUserId,
        toUserId,
        status: normalizeStatus(row.status),
        note: asString(row.note),
        reason: asString(row.reason),
        requestedAt: maybeDate(row.requestedAt) ?? new Date(),
        decidedAt: maybeDate(row.decidedAt),
      },
    });
  }

  for (const rawRow of notificationsRaw) {
    const row = asObject(rawRow);
    const legacyUserId = asString(row.userId) ?? asString(row.recipientId);
    const userId = legacyUserId ? userIdMap.get(legacyUserId) : undefined;
    if (!userId) {
      continue;
    }

    await prisma.notification.create({
      data: {
        userId,
        type: NotificationType.SYSTEM,
        entityType: asString(row.entityType) ?? 'legacy',
        entityId: asString(row.entityId),
        groupKey: asString(row.groupKey),
        metadata: {
          legacyPayload: row as Prisma.InputJsonValue,
        } as Prisma.InputJsonObject,
        isRead: Boolean(row.isRead),
        createdAt: maybeDate(row.createdAt) ?? new Date(),
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        migratedUsers: usersRaw.length,
        migratedPosts: postsRaw.length,
        migratedKoi: koiSources.length,
        migratedTransfers: transactionsRaw.length,
        migratedNotifications: notificationsRaw.length,
      },
      null,
      2,
    ),
  );
}

migrate()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
