import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PDFParse } from 'pdf-parse';
import { PrismaService } from '../../prisma.service';
import { TextbookService } from '../textbook/textbook.service';

type Heading = { title: string; number?: string; page: number; kind: 'CHAPTER' | 'TOPIC' | 'SUBTOPIC' };
type StructuredPage = { page: number; text: string; chapterIndex: number; topicIndex?: number; subtopicIndex?: number };

@Injectable()
export class GameDocumentProcessingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly textbooks: TextbookService,
  ) {}

  async process(textbookVersionId: string, schoolId: string, userId: string) {
    const existing = await this.prisma.processedTextbook.findFirst({ where: { textbookVersionId, schoolId } });
    if (existing?.status === 'READY') return this.details(existing.id, schoolId);
    if (existing?.status === 'PROCESSING') throw new BadRequestException('This textbook version is already processing.');
    const source = await this.textbooks.getVersionPdf(textbookVersionId, schoolId);
    const document = existing || await this.prisma.processedTextbook.create({
      data: {
        schoolId, textbookVersionId, createdById: userId,
        boardId: source.textbook.boardId, academicYearId: source.textbook.academicYearId,
        gradeId: source.textbook.gradeId, subjectId: source.textbook.subjectId,
      },
    });
    return this.run(document.id, source.buffer, schoolId, userId, existing ? 'RETRY' : 'PROCESS');
  }

  async reprocess(processedTextbookId: string, schoolId: string, userId: string) {
    const document = await this.findOwned(processedTextbookId, schoolId);
    if (document.status === 'PROCESSING') throw new BadRequestException('This document is already processing.');
    const source = await this.textbooks.getVersionPdf(document.textbookVersionId, schoolId);
    return this.run(document.id, source.buffer, schoolId, userId, 'REPROCESS');
  }

  async list(schoolId: string, q: any) {
    const page = Math.max(Number(q.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(q.pageSize) || 12, 1), 100);
    const where: Prisma.ProcessedTextbookWhereInput = {
      schoolId,
      ...(q.status && { status: q.status }),
      ...(q.textbookVersionId && { textbookVersionId: q.textbookVersionId }),
      ...(q.search && { textbookVersion: { textbook: { title: { contains: q.search, mode: 'insensitive' } } } }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.processedTextbook.findMany({
        where, include: this.bookInclude(), orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      this.prisma.processedTextbook.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async details(id: string, schoolId: string) {
    const row = await this.prisma.processedTextbook.findFirst({
      where: { id, schoolId },
      include: {
        ...this.bookInclude(),
        chapters: { orderBy: { sequence: 'asc' }, include: {
          topics: { where: { type: 'TOPIC' }, orderBy: { sequence: 'asc' }, include: {
            subtopics: { orderBy: { sequence: 'asc' } },
          } },
        } },
        processingHistory: { orderBy: { startedAt: 'desc' }, take: 50 },
        processingLogs: { orderBy: { createdAt: 'desc' }, take: 200 },
      },
    });
    if (!row) throw new NotFoundException('Processed textbook not found.');
    return row;
  }

  async status(id: string, schoolId: string) {
    const row = await this.findOwned(id, schoolId);
    return {
      id: row.id, status: row.status, progress: row.progress, currentStage: row.currentStage,
      errorMessage: row.errorMessage, processingDate: row.processingDate, updatedAt: row.updatedAt,
    };
  }

  async chapters(id: string, schoolId: string) {
    await this.findOwned(id, schoolId);
    return this.prisma.processedChapter.findMany({
      where: { processedTextbookId: id }, orderBy: { sequence: 'asc' },
      include: { topics: { where: { type: 'TOPIC' }, orderBy: { sequence: 'asc' } } },
    });
  }

  async topics(id: string, schoolId: string) {
    await this.findOwned(id, schoolId);
    return this.prisma.processedTopic.findMany({
      where: { processedTextbookId: id }, orderBy: [{ type: 'asc' }, { sequence: 'asc' }],
      include: { subtopics: { orderBy: { sequence: 'asc' } } },
    });
  }

  private async run(id: string, buffer: Buffer, schoolId: string, userId: string, operation: string) {
    const started = Date.now();
    const current = await this.findOwned(id, schoolId);
    const attempt = await this.prisma.processingHistory.count({ where: { processedTextbookId: id } }) + 1;
    const history = await this.prisma.processingHistory.create({
      data: { processedTextbookId: id, operation, attempt, fromStatus: current.status, toStatus: 'PROCESSING' },
    });
    await this.updateStage(id, 'VALIDATING', 5, 'PDF signature and source tenancy validated.');
    const parser = new PDFParse({ data: buffer });
    try {
      await this.prisma.processedTextbook.update({
        where: { id }, data: { status: 'PROCESSING', errorMessage: null, processingDate: new Date() },
      });
      await this.updateStage(id, 'EXTRACTING_TEXT', 25, 'Extracting page-aware text from PDF.');
      // pdf.js keeps document state inside a worker; read sequentially so the same
      // worker-backed document is never cloned by two concurrent operations.
      const textResult = await parser.getText();
      const infoResult = await parser.getInfo();
      const pages = textResult.pages.map((page) => ({ page: page.num, text: this.cleanText(page.text) }));
      const completeText = pages.map((page) => page.text).join('\n').trim();
      if (completeText.length < 20) throw new BadRequestException('The PDF does not contain enough readable text. Scanned image-only PDFs require OCR, which is not enabled in this phase.');

      await this.updateStage(id, 'EXTRACTING_METADATA', 40, 'Document metadata and page count extracted.');
      const structure = this.detectStructure(pages);
      await this.updateStage(id, 'DETECTING_STRUCTURE', 60, `Detected ${structure.chapters.length} chapters and ${structure.topics.length} topics.`);
      await this.persistStructure(id, structure, pages, {
        title: infoResult.info?.Title || null,
        author: infoResult.info?.Author || null,
        subject: infoResult.info?.Subject || null,
        creator: infoResult.info?.Creator || null,
        producer: infoResult.info?.Producer || null,
        fingerprints: infoResult.fingerprints || [],
        source: 'INTERNAL_DETERMINISTIC_PDF_PIPELINE',
      });
      await this.updateStage(id, 'STORING_CONTENT', 90, 'Structured page content stored securely.');
      const wordCount = completeText.split(/\s+/).filter(Boolean).length;
      await this.prisma.$transaction([
        this.prisma.processedTextbook.update({
          where: { id }, data: {
            status: 'READY', progress: 100, currentStage: 'READY',
            pageCount: pages.length, characterCount: completeText.length, wordCount,
            chapterCount: structure.chapters.length,
            topicCount: structure.topics.filter((topic) => topic.kind === 'TOPIC').length,
            subtopicCount: structure.topics.filter((topic) => topic.kind === 'SUBTOPIC').length,
            lastProcessedAt: new Date(), errorMessage: null,
          },
        }),
        this.prisma.processingHistory.update({
          where: { id: history.id }, data: { toStatus: 'READY', completedAt: new Date(), durationMs: Date.now() - started },
        }),
        this.prisma.processingLog.create({
          data: { processedTextbookId: id, stage: 'READY', message: 'Document processing completed. Structured content is ready for the next phase.', details: { userId } },
        }),
      ]);
      return this.details(id, schoolId);
    } catch (error: any) {
      const message = error?.message || 'Document processing failed.';
      await this.prisma.$transaction([
        this.prisma.processedTextbook.update({ where: { id }, data: { status: 'FAILED', progress: 0, currentStage: 'FAILED', errorMessage: message } }),
        this.prisma.processingHistory.update({ where: { id: history.id }, data: { toStatus: 'FAILED', completedAt: new Date(), durationMs: Date.now() - started, errorMessage: message } }),
        this.prisma.processingLog.create({ data: { processedTextbookId: id, level: 'ERROR', stage: 'FAILED', message } }),
      ]);
      throw error;
    } finally {
      await parser.destroy();
    }
  }

  private detectStructure(pages: Array<{ page: number; text: string }>) {
    const chapters: Heading[] = [];
    const topics: Array<Heading & { chapterIndex: number; parentIndex?: number }> = [];
    const structuredPages: StructuredPage[] = [];
    let chapterIndex = -1;
    let topicIndex: number | undefined;
    let subtopicIndex: number | undefined;
    for (const page of pages) {
      for (const rawLine of page.text.split(/\r?\n/)) {
        const line = rawLine.replace(/\s+/g, ' ').trim();
        if (!line || line.length > 140) continue;
        const chapter = line.match(/^(?:chapter|unit)\s+([0-9ivxlcdm]+)\s*[:.\-–—]?\s*(.*)$/i);
        const numbered = line.match(/^(\d+(?:\.\d+)+)\s*[:.\-–—]?\s+(.{3,})$/);
        if (chapter) {
          chapters.push({ kind: 'CHAPTER', number: chapter[1], title: chapter[2] || `Chapter ${chapter[1]}`, page: page.page });
          chapterIndex = chapters.length - 1; topicIndex = undefined; subtopicIndex = undefined;
        } else if (numbered) {
          if (chapterIndex < 0) {
            chapters.push({ kind: 'CHAPTER', title: 'Book Content', page: page.page });
            chapterIndex = 0;
          }
          const depth = numbered[1].split('.').length;
          const heading: Heading & { chapterIndex: number; parentIndex?: number } = {
            kind: depth >= 3 ? 'SUBTOPIC' : 'TOPIC', number: numbered[1], title: numbered[2], page: page.page, chapterIndex,
            ...(depth >= 3 && topicIndex !== undefined ? { parentIndex: topicIndex } : {}),
          };
          topics.push(heading);
          if (heading.kind === 'TOPIC') { topicIndex = topics.length - 1; subtopicIndex = undefined; }
          else subtopicIndex = topics.length - 1;
        }
      }
      if (chapterIndex < 0) {
        chapters.push({ kind: 'CHAPTER', title: 'Book Content', page: page.page });
        chapterIndex = 0;
      }
      structuredPages.push({ page: page.page, text: page.text, chapterIndex, topicIndex, subtopicIndex });
    }
    if (!topics.length) topics.push({ kind: 'TOPIC', title: 'Document Content', page: pages[0]?.page || 1, chapterIndex: 0 });
    for (let i = 0; i < chapters.length; i++) {
      const nextPage = chapters[i + 1]?.page;
      (chapters[i] as any).endPage = nextPage ? nextPage - 1 : pages.at(-1)?.page || chapters[i].page;
    }
    for (let i = 0; i < topics.length; i++) {
      const next = topics.slice(i + 1).find((candidate) => candidate.chapterIndex === topics[i].chapterIndex && candidate.kind === topics[i].kind);
      (topics[i] as any).endPage = next ? next.page - 1 : (chapters[topics[i].chapterIndex] as any).endPage;
    }
    return { chapters, topics, structuredPages };
  }

  private async persistStructure(
    id: string,
    structure: ReturnType<GameDocumentProcessingService['detectStructure']>,
    pages: Array<{ page: number; text: string }>,
    metadata: Prisma.InputJsonValue,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.processedContent.deleteMany({ where: { processedTextbookId: id } });
      await tx.processedTopic.deleteMany({ where: { processedTextbookId: id } });
      await tx.processedChapter.deleteMany({ where: { processedTextbookId: id } });
      const chapterIds: string[] = [];
      for (let index = 0; index < structure.chapters.length; index++) {
        const heading = structure.chapters[index] as Heading & { endPage: number };
        const row = await tx.processedChapter.create({ data: {
          processedTextbookId: id, title: heading.title, chapterNumber: heading.number,
          sequence: index + 1, startPage: heading.page, endPage: heading.endPage,
        } });
        chapterIds.push(row.id);
      }
      const topicIds: string[] = [];
      for (let index = 0; index < structure.topics.length; index++) {
        const heading = structure.topics[index] as Heading & { chapterIndex: number; parentIndex?: number; endPage: number };
        const row = await tx.processedTopic.create({ data: {
          processedTextbookId: id, chapterId: chapterIds[heading.chapterIndex],
          parentTopicId: heading.parentIndex === undefined ? null : topicIds[heading.parentIndex],
          title: heading.title, topicNumber: heading.number, type: heading.kind,
          sequence: index + 1, startPage: heading.page, endPage: heading.endPage,
        } });
        topicIds.push(row.id);
      }
      for (let index = 0; index < pages.length; index++) {
        const page = pages[index];
        const mapping = structure.structuredPages[index];
        await tx.processedContent.create({ data: {
          processedTextbookId: id, chapterId: chapterIds[mapping.chapterIndex],
          topicId: mapping.subtopicIndex !== undefined ? topicIds[mapping.subtopicIndex] :
            mapping.topicIndex !== undefined ? topicIds[mapping.topicIndex] : topicIds[0],
          pageNumber: page.page, sequence: 1, extractedText: page.text,
        } });
      }
      await tx.processedTextbook.update({ where: { id }, data: { documentMetadata: metadata } });
    }, { timeout: 120_000 });
  }

  private cleanText(text: string) {
    return text.replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }

  private async updateStage(id: string, stage: string, progress: number, message: string) {
    await this.prisma.$transaction([
      this.prisma.processedTextbook.update({ where: { id }, data: { currentStage: stage, progress } }),
      this.prisma.processingLog.create({ data: { processedTextbookId: id, stage, message } }),
    ]);
  }

  private async findOwned(id: string, schoolId: string) {
    const row = await this.prisma.processedTextbook.findFirst({ where: { id, schoolId } });
    if (!row) throw new NotFoundException('Processed textbook not found.');
    return row;
  }

  private bookInclude() {
    return {
      textbookVersion: { include: { file: true, textbook: {
        include: { language: true, publisher: true, author: true },
      } } },
    } satisfies Prisma.ProcessedTextbookInclude;
  }
}
