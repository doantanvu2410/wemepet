CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "RoleCode" AS ENUM ('USER', 'MODERATOR', 'ADMIN');
CREATE TYPE "PostKind" AS ENUM ('STATUS', 'KOI_PROFILE');
CREATE TYPE "PostStatus" AS ENUM ('ACTIVE', 'HIDDEN', 'DELETED');
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'FOLLOWERS', 'PRIVATE');
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO', 'CERTIFICATE', 'AVATAR');
CREATE TYPE "CommentStatus" AS ENUM ('ACTIVE', 'HIDDEN', 'DELETED');
CREATE TYPE "KoiStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED');
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "NotificationType" AS ENUM (
  'POST_LIKE',
  'POST_COMMENT',
  'COMMENT_REPLY',
  'FOLLOW',
  'TRANSFER_REQUEST',
  'TRANSFER_ACCEPTED',
  'TRANSFER_REJECTED',
  'KOI_APPROVED',
  'KOI_REJECTED',
  'SYSTEM'
);
CREATE TYPE "ActorType" AS ENUM ('USER', 'SYSTEM');
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');
CREATE TYPE "UploadTarget" AS ENUM ('POST', 'KOI', 'AVATAR');

CREATE TABLE "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "auth_subject" TEXT NOT NULL UNIQUE,
  "email" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT,
  "display_name" TEXT NOT NULL,
  "avatar_url" TEXT,
  "bio" TEXT,
  "is_private" BOOLEAN NOT NULL DEFAULT FALSE,
  "email_verified_at" TIMESTAMPTZ,
  "last_login_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at" TIMESTAMPTZ
);

CREATE TABLE "roles" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" "RoleCode" NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "user_roles" (
  "user_id" UUID NOT NULL,
  "role_id" UUID NOT NULL,
  "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "assigned_by" UUID,
  PRIMARY KEY ("user_id", "role_id"),
  CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_roles_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "koi" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_user_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "variety" TEXT,
  "gender" TEXT,
  "birth_date" DATE,
  "size_cm" NUMERIC(6, 2),
  "description" TEXT,
  "lineage" TEXT,
  "certificate_code" TEXT,
  "status" "KoiStatus" NOT NULL DEFAULT 'PENDING',
  "is_transfer_locked" BOOLEAN NOT NULL DEFAULT FALSE,
  "lock_version" INTEGER NOT NULL DEFAULT 0,
  "approved_by_user_id" UUID,
  "approved_at" TIMESTAMPTZ,
  "rejected_reason" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at" TIMESTAMPTZ,
  CONSTRAINT "koi_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "koi_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "posts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "author_id" UUID NOT NULL,
  "kind" "PostKind" NOT NULL DEFAULT 'STATUS',
  "status" "PostStatus" NOT NULL DEFAULT 'ACTIVE',
  "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC',
  "body_text" TEXT,
  "like_count" INTEGER NOT NULL DEFAULT 0,
  "comment_count" INTEGER NOT NULL DEFAULT 0,
  "share_count" INTEGER NOT NULL DEFAULT 0,
  "bookmark_count" INTEGER NOT NULL DEFAULT 0,
  "published_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at" TIMESTAMPTZ,
  "koi_id" UUID UNIQUE,
  CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "posts_koi_id_fkey" FOREIGN KEY ("koi_id") REFERENCES "koi"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "post_media" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "post_id" UUID NOT NULL,
  "kind" "MediaKind" NOT NULL,
  "url" TEXT NOT NULL,
  "thumbnail_url" TEXT,
  "mime_type" TEXT,
  "size_bytes" INTEGER,
  "width" INTEGER,
  "height" INTEGER,
  "duration_sec" INTEGER,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "post_media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "comments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "post_id" UUID NOT NULL,
  "author_id" UUID NOT NULL,
  "parent_comment_id" UUID,
  "root_comment_id" UUID,
  "depth" INTEGER NOT NULL DEFAULT 0,
  "body" TEXT NOT NULL,
  "status" "CommentStatus" NOT NULL DEFAULT 'ACTIVE',
  "like_count" INTEGER NOT NULL DEFAULT 0,
  "reply_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at" TIMESTAMPTZ,
  CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "comments_root_comment_id_fkey" FOREIGN KEY ("root_comment_id") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "likes" (
  "user_id" UUID NOT NULL,
  "post_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("user_id", "post_id"),
  CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "bookmarks" (
  "user_id" UUID NOT NULL,
  "post_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("user_id", "post_id"),
  CONSTRAINT "bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "bookmarks_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "follows" (
  "follower_id" UUID NOT NULL,
  "followee_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("follower_id", "followee_id"),
  CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "follows_followee_id_fkey" FOREIGN KEY ("followee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "koi_media" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "koi_id" UUID NOT NULL,
  "kind" "MediaKind" NOT NULL,
  "url" TEXT NOT NULL,
  "thumbnail_url" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "koi_media_koi_id_fkey" FOREIGN KEY ("koi_id") REFERENCES "koi"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "transfers" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "koi_id" UUID NOT NULL,
  "from_user_id" UUID NOT NULL,
  "to_user_id" UUID NOT NULL,
  "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
  "note" TEXT,
  "reason" TEXT,
  "requested_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "decided_at" TIMESTAMPTZ,
  "cancelled_at" TIMESTAMPTZ,
  "expires_at" TIMESTAMPTZ,
  "idempotency_key" TEXT UNIQUE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "transfers_koi_id_fkey" FOREIGN KEY ("koi_id") REFERENCES "koi"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "transfers_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "transfers_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "notifications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "actor_user_id" UUID,
  "type" "NotificationType" NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT,
  "group_key" TEXT,
  "metadata" JSONB NOT NULL,
  "is_read" BOOLEAN NOT NULL DEFAULT FALSE,
  "read_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notifications_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "notification_stats" (
  "user_id" UUID PRIMARY KEY,
  "unread_count" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "notification_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "audit_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "actor_user_id" UUID,
  "actor_type" "ActorType" NOT NULL DEFAULT 'USER',
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT,
  "request_id" TEXT,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "metadata" JSONB,
  "before_state" JSONB,
  "after_state" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "outbox_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_type" TEXT NOT NULL,
  "aggregate_type" TEXT NOT NULL,
  "aggregate_id" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "available_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "processed_at" TIMESTAMPTZ,
  "last_error" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "media_upload_intents" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "uploader_user_id" UUID NOT NULL,
  "target" "UploadTarget" NOT NULL,
  "target_id" TEXT,
  "object_key" TEXT NOT NULL UNIQUE,
  "mime_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "expires_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "media_upload_intents_uploader_user_id_fkey" FOREIGN KEY ("uploader_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "users_created_at_idx" ON "users" ("created_at");
CREATE INDEX "user_roles_role_id_idx" ON "user_roles" ("role_id");
CREATE INDEX "koi_owner_user_id_created_at_idx" ON "koi" ("owner_user_id", "created_at");
CREATE INDEX "koi_status_created_at_idx" ON "koi" ("status", "created_at");
CREATE INDEX "posts_author_id_published_at_idx" ON "posts" ("author_id", "published_at");
CREATE INDEX "posts_status_published_at_idx" ON "posts" ("status", "published_at");
CREATE INDEX "posts_koi_id_idx" ON "posts" ("koi_id");
CREATE INDEX "post_media_post_id_sort_order_idx" ON "post_media" ("post_id", "sort_order");
CREATE INDEX "comments_post_id_created_at_idx" ON "comments" ("post_id", "created_at");
CREATE INDEX "comments_parent_comment_id_idx" ON "comments" ("parent_comment_id");
CREATE INDEX "comments_root_comment_id_idx" ON "comments" ("root_comment_id");
CREATE INDEX "likes_post_id_idx" ON "likes" ("post_id");
CREATE INDEX "bookmarks_post_id_idx" ON "bookmarks" ("post_id");
CREATE INDEX "follows_followee_id_idx" ON "follows" ("followee_id");
CREATE INDEX "koi_media_koi_id_sort_order_idx" ON "koi_media" ("koi_id", "sort_order");
CREATE INDEX "transfers_koi_id_status_idx" ON "transfers" ("koi_id", "status");
CREATE INDEX "transfers_to_user_id_status_requested_at_idx" ON "transfers" ("to_user_id", "status", "requested_at");
CREATE INDEX "transfers_from_user_id_requested_at_idx" ON "transfers" ("from_user_id", "requested_at");
CREATE UNIQUE INDEX "transfers_one_pending_per_koi_uniq" ON "transfers" ("koi_id") WHERE "status" = 'PENDING';
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications" ("user_id", "is_read", "created_at");
CREATE INDEX "notifications_group_key_idx" ON "notifications" ("group_key");
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs" ("actor_user_id", "created_at");
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs" ("entity_type", "entity_id");
CREATE INDEX "outbox_events_status_available_at_idx" ON "outbox_events" ("status", "available_at");
CREATE INDEX "outbox_events_aggregate_type_aggregate_id_idx" ON "outbox_events" ("aggregate_type", "aggregate_id");
CREATE INDEX "media_upload_intents_uploader_user_id_created_at_idx" ON "media_upload_intents" ("uploader_user_id", "created_at");
CREATE INDEX "media_upload_intents_target_target_id_idx" ON "media_upload_intents" ("target", "target_id");

INSERT INTO "roles" ("code", "name", "description") VALUES
  ('USER', 'User', 'Default product user role'),
  ('MODERATOR', 'Moderator', 'Content moderation role'),
  ('ADMIN', 'Admin', 'System administrator role')
ON CONFLICT ("code") DO NOTHING;
