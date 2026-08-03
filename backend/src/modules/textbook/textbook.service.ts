import {
  BadRequestException, Injectable, NotFoundException, ServiceUnavailableException,
} from '@nestjs/common';
import {
  CreateBucketCommand, DeleteObjectCommand, GetObjectCommand, HeadBucketCommand,
  PutObjectCommand, S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma.service';
import { CreateTextbookDto, RestoreTextbookDto, UploadTextbookDto } from './dto/textbook.dto';

const DEFAULT_LANGUAGES = [
  ['English', 'en'], ['Hindi', 'hi'], ['Telugu', 'te'], ['French', 'fr'], ['Sanskrit', 'sa'],
];

@Injectable()
export class TextbookService {
  private readonly bucket = process.env.MINIO_BUCKET || 'admissionsos';
  private storage = this.createStorageClient(
    process.env.MINIO_ACCESS_KEY || 'admin',
    process.env.MINIO_SECRET_KEY || 'adminpassword',
  );
  private usingDevelopmentFallback = false;

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTextbookDto, schoolId: string, userId: string) {
    await this.validateCurriculum(dto, schoolId);
    const refs = await this.resolveReferences(dto, schoolId);
    return this.prisma.$transaction(async (tx) => {
      const textbook = await tx.textbook.create({
        data: {
          textbookId: dto.textbookId || `TB-${randomUUID().slice(0, 8).toUpperCase()}`,
          schoolId, createdById: userId, title: dto.title, subtitle: dto.subtitle,
          description: dto.description, boardId: dto.boardId, academicYearId: dto.academicYearId,
          gradeId: dto.gradeId, subjectId: dto.subjectId, languageId: refs.language.id,
          publisherId: refs.publisher.id, authorId: refs.author.id, edition: dto.edition,
          isbn: dto.isbn, coverImage: dto.coverImage, status: dto.status || 'DRAFT',
        },
        include: this.detailsInclude(),
      });
      await this.audit(tx, schoolId, textbook.id, userId, 'CREATE', dto);
      return textbook;
    });
  }

  async list(schoolId: string, q: any) {
    const page = Math.max(Number(q.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(q.pageSize) || 12, 1), 100);
    const where: Prisma.TextbookWhereInput = {
      schoolId,
      ...(q.boardId && { boardId: q.boardId }),
      ...(q.academicYearId && { academicYearId: q.academicYearId }),
      ...(q.gradeId && { gradeId: q.gradeId }),
      ...(q.subjectId && { subjectId: q.subjectId }),
      ...(q.languageId && { languageId: q.languageId }),
      ...(q.publisherId && { publisherId: q.publisherId }),
      ...(q.authorId && { authorId: q.authorId }),
      ...(q.status && { status: q.status }),
      ...(q.search && { OR: [
        { title: { contains: q.search, mode: 'insensitive' } },
        { subtitle: { contains: q.search, mode: 'insensitive' } },
        { textbookId: { contains: q.search, mode: 'insensitive' } },
        { isbn: { contains: q.search, mode: 'insensitive' } },
      ] }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.textbook.findMany({
        where, include: this.detailsInclude(), orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      this.prisma.textbook.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string, schoolId: string) {
    const textbook = await this.prisma.textbook.findFirst({
      where: { id, schoolId },
      include: { ...this.detailsInclude(), versions: { include: { file: true }, orderBy: { createdAt: 'desc' } } },
    });
    if (!textbook) throw new NotFoundException('Textbook not found.');
    return textbook;
  }

  async update(id: string, dto: CreateTextbookDto, schoolId: string, userId: string) {
    await this.findOne(id, schoolId);
    await this.validateCurriculum(dto, schoolId);
    const refs = await this.resolveReferences(dto, schoolId);
    return this.prisma.$transaction(async (tx) => {
      const textbook = await tx.textbook.update({
        where: { id },
        data: {
          title: dto.title, subtitle: dto.subtitle, description: dto.description,
          boardId: dto.boardId, academicYearId: dto.academicYearId, gradeId: dto.gradeId,
          subjectId: dto.subjectId, languageId: refs.language.id, publisherId: refs.publisher.id,
          authorId: refs.author.id, edition: dto.edition, isbn: dto.isbn,
          coverImage: dto.coverImage, status: dto.status,
        },
        include: this.detailsInclude(),
      });
      await this.audit(tx, schoolId, id, userId, 'UPDATE', dto);
      return textbook;
    });
  }

  async upload(id: string, dto: UploadTextbookDto, file: Express.Multer.File, schoolId: string, userId: string, replace = false) {
    const textbook = await this.findOne(id, schoolId);
    this.validatePdf(file);
    const checksum = createHash('sha256').update(file.buffer).digest('hex');
    const duplicate = await this.prisma.textbookFile.findFirst({
      where: { checksum, version: { textbook: { schoolId } } },
      include: { version: { include: { textbook: true } } },
    });
    if (duplicate) throw new BadRequestException(`Duplicate PDF detected. It already exists in "${duplicate.version.textbook.title}" version ${duplicate.version.versionNumber}.`);
    const existingVersion = await this.prisma.textbookVersion.findUnique({
      where: { textbookId_versionNumber: { textbookId: id, versionNumber: dto.versionNumber } },
    });
    if (existingVersion) throw new BadRequestException('This version number already exists. Use a new version number.');

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `tenants/${schoolId}/textbooks/${id}/${randomUUID()}_${safeName}`;
    try {
      await this.ensureBucket();
      await this.storage.send(new PutObjectCommand({
        Bucket: this.bucket, Key: objectKey, Body: file.buffer, ContentType: 'application/pdf',
        Metadata: { checksum, textbookId: id },
      }));
    } catch (error) {
      console.error('Textbook PDF storage upload failed.', error);
      throw new ServiceUnavailableException('Secure textbook storage is temporarily unavailable.');
    }

    const pageCount = dto.numberOfPages || this.estimatePdfPages(file.buffer);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.textbookVersion.updateMany({ where: { textbookId: id, isActive: true }, data: { isActive: false } });
        const version = await tx.textbookVersion.create({
          data: {
            textbookId: id, versionNumber: dto.versionNumber, numberOfPages: pageCount,
            isActive: true, changeNote: dto.changeNote || (replace ? 'PDF replaced' : 'Initial PDF upload'),
            createdById: userId,
            file: { create: {
              objectKey, originalName: file.originalname, mimeType: 'application/pdf',
              fileSize: file.size, checksum, pageCount, uploadedById: userId,
            } },
          },
          include: { file: true },
        });
        await tx.textbook.update({ where: { id }, data: { activeVersionId: version.id } });
        await this.audit(tx, schoolId, id, userId, replace ? 'REPLACE_PDF' : 'UPLOAD_PDF', {
          versionNumber: dto.versionNumber, fileName: file.originalname, fileSize: file.size, checksum,
        });
        return { ...version, textbook: { id: textbook.id, title: textbook.title } };
      });
    } catch (error) {
      await this.storage.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey })).catch(() => undefined);
      throw error;
    }
  }

  async accessUrl(id: string, schoolId: string, disposition: 'inline' | 'attachment', versionId?: string) {
    const textbook = await this.findOne(id, schoolId);
    const version = versionId
      ? textbook.versions.find((item) => item.id === versionId)
      : textbook.versions.find((item) => item.id === textbook.activeVersionId || item.isActive);
    if (!version?.file) throw new NotFoundException('No PDF is available for this textbook version.');
    await this.ensureBucket();
    const command = new GetObjectCommand({
      Bucket: this.bucket, Key: version.file.objectKey,
      ResponseContentType: 'application/pdf',
      ResponseContentDisposition: `${disposition}; filename="${version.file.originalName.replace(/"/g, '')}"`,
    });
    const url = await getSignedUrl(this.storage, command, { expiresIn: 900 });
    return {
      url, expiresIn: 900, versionId: version.id, versionNumber: version.versionNumber,
      fileName: version.file.originalName, pageCount: version.numberOfPages || version.file.pageCount,
    };
  }

  async versions(id: string, schoolId: string) {
    const textbook = await this.findOne(id, schoolId);
    return textbook.versions;
  }

  async restore(id: string, dto: RestoreTextbookDto, schoolId: string, userId: string) {
    const textbook = await this.findOne(id, schoolId);
    const version = textbook.versions.find((item) => item.id === dto.versionId);
    if (!version?.file) throw new NotFoundException('Textbook version or its PDF was not found.');
    return this.prisma.$transaction(async (tx) => {
      await tx.textbookVersion.updateMany({ where: { textbookId: id, isActive: true }, data: { isActive: false } });
      const restored = await tx.textbookVersion.update({ where: { id: version.id }, data: { isActive: true } });
      await tx.textbook.update({ where: { id }, data: { activeVersionId: version.id } });
      await this.audit(tx, schoolId, id, userId, 'RESTORE_VERSION', { versionId: version.id, versionNumber: version.versionNumber });
      return restored;
    });
  }

  async remove(id: string, schoolId: string, userId: string) {
    const textbook = await this.findOne(id, schoolId);
    await Promise.all(textbook.versions.flatMap((version) => version.file
      ? [this.storage.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: version.file.objectKey }))]
      : []).map((promise) => promise.catch(() => undefined)));
    await this.prisma.$transaction(async (tx) => {
      await this.audit(tx, schoolId, id, userId, 'DELETE', { textbookId: textbook.textbookId, title: textbook.title });
      await tx.textbook.delete({ where: { id } });
    });
    return { success: true };
  }

  async options(schoolId: string) {
    await this.prisma.language.createMany({
      data: DEFAULT_LANGUAGES.map(([name, code]) => ({ schoolId, name, code })),
      skipDuplicates: true,
    });
    const [languages, publishers, authors] = await Promise.all([
      this.prisma.language.findMany({ where: { schoolId }, orderBy: { name: 'asc' } }),
      this.prisma.publisher.findMany({ where: { schoolId }, orderBy: { name: 'asc' } }),
      this.prisma.author.findMany({ where: { schoolId }, orderBy: { name: 'asc' } }),
    ]);
    return { languages, publishers, authors, supportedFileTypes: ['PDF'], futureFileTypes: ['DOCX', 'PPT', 'IMAGES'] };
  }

  auditLogs(schoolId: string, limit = 100) {
    return this.prisma.textbookAuditLog.findMany({
      where: { schoolId }, orderBy: { createdAt: 'desc' }, take: Math.min(limit, 200),
    });
  }

  async getVersionPdf(versionId: string, schoolId: string) {
    const version = await this.prisma.textbookVersion.findFirst({
      where: { id: versionId, textbook: { schoolId } },
      include: { file: true, textbook: true },
    });
    if (!version?.file) throw new NotFoundException('The selected textbook version has no PDF.');
    await this.ensureBucket();
    const object = await this.storage.send(new GetObjectCommand({ Bucket: this.bucket, Key: version.file.objectKey }));
    if (!object.Body) throw new NotFoundException('The textbook PDF could not be read from storage.');
    const bytes = await object.Body.transformToByteArray();
    return { buffer: Buffer.from(bytes), file: version.file, version, textbook: version.textbook };
  }

  private detailsInclude() {
    return {
      language: true, publisher: true, author: true,
      versions: { where: { isActive: true }, include: { file: true }, take: 1 },
    } satisfies Prisma.TextbookInclude;
  }

  private async validateCurriculum(dto: CreateTextbookDto, schoolId: string) {
    const [board, year, grade, subject] = await Promise.all([
      this.prisma.curriculumBoard.findFirst({ where: { id: dto.boardId, schoolId } }),
      this.prisma.academicYear.findFirst({ where: { id: dto.academicYearId, schoolId, OR: [{ boardId: dto.boardId }, { boardId: null }] } }),
      this.prisma.curriculumGrade.findFirst({ where: { id: dto.gradeId, schoolId, boardId: dto.boardId, academicYearId: dto.academicYearId } }),
      this.prisma.curriculumSubject.findFirst({ where: { id: dto.subjectId, schoolId, gradeId: dto.gradeId } }),
    ]);
    if (!board || !year || !grade || !subject) throw new BadRequestException('The selected curriculum hierarchy is invalid for this school.');
  }

  private async resolveReferences(dto: CreateTextbookDto, schoolId: string) {
    const languageCode = dto.language.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 12);
    const [language, publisher, author] = await Promise.all([
      this.prisma.language.upsert({
        where: { schoolId_code: { schoolId, code: languageCode } },
        update: { name: dto.language.trim() }, create: { schoolId, code: languageCode, name: dto.language.trim() },
      }),
      this.prisma.publisher.upsert({
        where: { schoolId_name: { schoolId, name: dto.publisher.trim() } },
        update: {}, create: { schoolId, name: dto.publisher.trim() },
      }),
      this.prisma.author.upsert({
        where: { schoolId_name: { schoolId, name: dto.author.trim() } },
        update: {}, create: { schoolId, name: dto.author.trim() },
      }),
    ]);
    return { language, publisher, author };
  }

  private validatePdf(file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('A PDF file is required.');
    if (file.mimetype !== 'application/pdf') throw new BadRequestException('Only application/pdf files are supported in this phase.');
    if (file.size < 5 || file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-') throw new BadRequestException('The uploaded file is not a valid PDF.');
    if (file.size > 50 * 1024 * 1024) throw new BadRequestException('PDF size must not exceed 50 MB.');
  }

  private estimatePdfPages(buffer: Buffer) {
    const matches = buffer.toString('latin1').match(/\/Type\s*\/Page\b/g);
    return matches?.length || undefined;
  }

  private async ensureBucket(): Promise<void> {
    try {
      await this.storage.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error: any) {
      if (
        (error?.name === 'InvalidAccessKeyId' || error?.name === 'AccessDenied' || error?.$metadata?.httpStatusCode === 403) &&
        process.env.NODE_ENV !== 'production' &&
        !process.env.MINIO_ACCESS_KEY &&
        !this.usingDevelopmentFallback
      ) {
        this.storage = this.createStorageClient('minioadmin', 'minioadmin');
        this.usingDevelopmentFallback = true;
        return this.ensureBucket();
      }
      try {
        await this.storage.send(new CreateBucketCommand({ Bucket: this.bucket }));
      } catch (error: any) {
        if (error?.name !== 'BucketAlreadyOwnedByYou' && error?.name !== 'BucketAlreadyExists') throw error;
      }
    }
  }

  private createStorageClient(accessKeyId: string, secretAccessKey: string) {
    return new S3Client({
      region: 'us-east-1',
      endpoint: `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || 9000}`,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
  }

  private audit(tx: Prisma.TransactionClient, schoolId: string, textbookId: string, userId: string, action: string, changes?: unknown) {
    return tx.textbookAuditLog.create({
      data: { schoolId, textbookId, userId, action, changes: changes as Prisma.InputJsonValue },
    });
  }
}
