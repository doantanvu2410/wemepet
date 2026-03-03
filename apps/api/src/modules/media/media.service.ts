import { BadRequestException, Injectable } from '@nestjs/common';
import { UploadTarget } from '@prisma/client';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import path from 'path';
import { PrismaService } from '../../shared/infra/db/prisma.service';
import { CreateSignedUploadDto } from './dto/create-signed-upload.dto';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 250 * 1024 * 1024;
const MAX_CERT_BYTES = 15 * 1024 * 1024;

@Injectable()
export class MediaService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly cdnBaseUrl: string;

  constructor(private readonly prisma: PrismaService) {
    this.bucket = process.env.S3_BUCKET ?? '';
    this.cdnBaseUrl = process.env.CDN_BASE_URL ?? '';

    this.s3 = new S3Client({
      region: process.env.S3_REGION,
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      credentials:
        process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY
          ? {
              accessKeyId: process.env.S3_ACCESS_KEY,
              secretAccessKey: process.env.S3_SECRET_KEY,
            }
          : undefined,
    });
  }

  async createSignedUpload(userId: string, dto: CreateSignedUploadDto) {
    this.validateMimeAndSize(dto.target, dto.mimeType, dto.sizeBytes);

    if (!this.bucket || !this.cdnBaseUrl) {
      throw new BadRequestException('S3 bucket/CDN config is missing');
    }

    const extension = path.extname(dto.fileName || '').replace(/[^a-zA-Z0-9.]/g, '').toLowerCase();
    const fileExt = extension || '.bin';
    const objectKey = `${dto.target.toLowerCase()}/${userId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${fileExt}`;
    const expiresInSeconds = 15 * 60;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: dto.mimeType,
      ContentLength: dto.sizeBytes,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: expiresInSeconds,
    });

    const intent = await this.prisma.mediaUploadIntent.create({
      data: {
        uploaderUserId: userId,
        target: dto.target,
        targetId: dto.targetId,
        objectKey,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        expiresAt,
      },
    });

    return {
      intentId: intent.id,
      objectKey,
      uploadUrl,
      publicUrl: `${this.cdnBaseUrl.replace(/\/$/, '')}/${objectKey}`,
      expiresAt,
      headers: {
        'Content-Type': dto.mimeType,
      },
    };
  }

  async completeUpload(userId: string, intentId: string) {
    const intent = await this.prisma.mediaUploadIntent.findFirst({
      where: {
        id: intentId,
        uploaderUserId: userId,
      },
    });

    if (!intent) {
      throw new BadRequestException('Upload intent not found');
    }

    if (intent.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Upload intent expired');
    }

    const updated = await this.prisma.mediaUploadIntent.update({
      where: { id: intentId },
      data: { status: 'uploaded' },
    });

    return {
      ok: true,
      intentId: updated.id,
      objectKey: updated.objectKey,
      publicUrl: `${this.cdnBaseUrl.replace(/\/$/, '')}/${updated.objectKey}`,
    };
  }

  private validateMimeAndSize(target: UploadTarget, mimeType: string, sizeBytes: number) {
    const isImage = /^image\//.test(mimeType);
    const isVideo = /^video\//.test(mimeType);
    const isPdf = mimeType === 'application/pdf';

    if (target === UploadTarget.AVATAR && !isImage) {
      throw new BadRequestException('Avatar must be an image');
    }

    if (target === UploadTarget.POST && !isImage && !isVideo) {
      throw new BadRequestException('Post media must be image or video');
    }

    if (target === UploadTarget.KOI && !isImage && !isPdf) {
      throw new BadRequestException('Koi media must be image or PDF');
    }

    if (isImage && sizeBytes > MAX_IMAGE_BYTES) {
      throw new BadRequestException('Image exceeds 10MB');
    }

    if (isVideo && sizeBytes > MAX_VIDEO_BYTES) {
      throw new BadRequestException('Video exceeds 250MB');
    }

    if (isPdf && sizeBytes > MAX_CERT_BYTES) {
      throw new BadRequestException('Certificate file exceeds 15MB');
    }
  }
}
