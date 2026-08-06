import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma.service';
import { GenerateGameQuestionsDto, UpdateGameQuestionDto } from './dto/game-ai-question.dto';

const TYPES = ['MCQ', 'TRUE_FALSE', 'FILL_IN_THE_BLANKS', 'MATCH_THE_FOLLOWING', 'ONE_WORD', 'SHORT_ANSWER', 'LONG_ANSWER', 'CASE_STUDY', 'COMPETENCY', 'HOTS'];
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'MIXED'];

@Injectable()
export class GameAIQuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(dto: GenerateGameQuestionsDto, schoolId: string, userId: string) {
    if (!DIFFICULTIES.includes(dto.difficulty.toUpperCase())) throw new BadRequestException('Difficulty must be Easy, Medium, Hard, or Mixed.');
    const types = dto.questionTypes.map((type) => type.toUpperCase().replace(/[ /-]+/g, '_'));
    if (!types.length || types.some((type) => !TYPES.includes(type))) throw new BadRequestException('One or more question types are unsupported.');
    const document = await this.prisma.processedTextbook.findFirst({
      where: { id: dto.processedTextbookId, schoolId },
      include: { textbookVersion: { include: { textbook: true } } },
    });
    if (!document) throw new NotFoundException('Processed textbook not found.');
    if (document.status !== 'READY') throw new BadRequestException('The selected textbook has not completed document processing.');
    if (dto.gameAssessmentId) {
      const assessment = await this.prisma.gameAssessment.findFirst({ where: { id: dto.gameAssessmentId, schoolId } });
      if (!assessment) throw new BadRequestException('The selected game assessment is invalid.');
      const textbook = document.textbookVersion.textbook;
      const mismatches = [
        assessment.boardId && assessment.boardId !== textbook.boardId ? 'board' : null,
        assessment.academicYearId && assessment.academicYearId !== textbook.academicYearId ? 'academic year' : null,
        assessment.gradeId && assessment.gradeId !== textbook.gradeId ? 'grade' : null,
        assessment.subjectId && assessment.subjectId !== textbook.subjectId ? 'subject' : null,
        assessment.textbookId && assessment.textbookId !== textbook.id ? 'textbook' : null,
        assessment.textbookVersionId && assessment.textbookVersionId !== document.textbookVersionId ? 'textbook version' : null,
      ].filter(Boolean);
      if (mismatches.length) {
        throw new BadRequestException(
          `The question source does not match the assessment ${mismatches.join(', ')}. Select a textbook for ${assessment.ageGroup} — ${assessment.subject}.`,
        );
      }
    }
    if (dto.chapterId) {
      const chapter = await this.prisma.processedChapter.findFirst({ where: { id: dto.chapterId, processedTextbookId: document.id } });
      if (!chapter) throw new BadRequestException('The selected chapter does not belong to this textbook.');
    }
    if (dto.topicId || dto.subtopicId) {
      const ids = [dto.topicId, dto.subtopicId].filter(Boolean) as string[];
      const count = await this.prisma.processedTopic.count({ where: { id: { in: ids }, processedTextbookId: document.id } });
      if (count !== ids.length) throw new BadRequestException('The selected topic or subtopic does not belong to this textbook.');
    }
    const content = await this.prisma.processedContent.findMany({
      where: {
        processedTextbookId: document.id,
        ...(dto.chapterId && { chapterId: dto.chapterId }),
        ...((dto.subtopicId || dto.topicId) && { topicId: dto.subtopicId || dto.topicId }),
      },
      orderBy: [{ pageNumber: 'asc' }, { sequence: 'asc' }],
    });
    if (!content.length || !content.some((row) => row.extractedText.trim().length >= 20)) throw new BadRequestException('No usable structured content exists for this selection.');

    const units = content.flatMap((row) => this.sentences(row.extractedText).map((text) => ({ text, row })))
      .filter((unit) => this.isInstructional(unit.text));
    if (!units.length) throw new BadRequestException('The selected content does not contain enough readable textbook sentences.');
    const vocabulary = this.keywords(units.map((unit) => unit.text).join(' '));
    const batchId = randomUUID();
    const previous = await this.prisma.gameAIQuestion.findMany({
      where: {
        schoolId,
        processedTextbookId: document.id,
        ...(dto.gameAssessmentId && { gameAssessmentId: dto.gameAssessmentId }),
        status: { not: 'ARCHIVED' },
      },
      select: { questionText: true },
    });
    const excludedTexts = [...previous.map((question) => question.questionText), ...(dto.excludeQuestionTexts || [])];
    const created: any[] = [];
    const usedQuestions = new Set(excludedTexts.map((text) => this.fingerprint(text)));
    const batchOffset = parseInt(batchId.slice(0, 8), 16) % units.length;
    const maxAttempts = Math.max(dto.questionCount * 20, units.length * types.length * 4);
    for (let attempt = 0; attempt < maxAttempts && created.length < dto.questionCount; attempt++) {
      const unit = units[(attempt + batchOffset) % units.length];
      const type = types[Math.floor(attempt / units.length) % types.length];
      const index: number = created.length;
      const difficulty: string = dto.difficulty.toUpperCase() === 'MIXED' ? ['EASY', 'MEDIUM', 'HARD'][index % 3] : dto.difficulty.toUpperCase();
      const draft = this.compose(unit.text, type, difficulty, vocabulary, attempt + batchOffset);
      const fingerprint = this.fingerprint(draft.questionText);
      if (usedQuestions.has(fingerprint) || !this.validDraft(draft)) continue;
      usedQuestions.add(fingerprint);
      const question: any = await this.prisma.$transaction(async (tx): Promise<any> => {
        const row: any = await tx.gameAIQuestion.create({ data: {
          schoolId, gameAssessmentId: dto.gameAssessmentId, processedTextbookId: document.id,
          textbookVersionId: document.textbookVersionId, chapterId: unit.row.chapterId,
          topicId: unit.row.topicId, pageNumber: unit.row.pageNumber,
          questionText: draft.questionText, correctAnswer: draft.correctAnswer,
          explanation: `The textbook says: ${unit.text}`,
          difficulty, questionType: type, bloomLevel: this.bloom(type, difficulty),
          learningOutcome: dto.learningOutcome, generationBatchId: batchId, createdById: userId,
          options: { create: draft.options.map((option, sequence) => ({ ...option, sequence })) },
        }, include: { options: { orderBy: { sequence: 'asc' } } } });
        const snapshot = this.snapshot(row);
        await tx.gameAIQuestionVersion.create({ data: { questionId: row.id, version: 1, snapshot, createdById: userId } });
        await tx.gameAIQuestionHistory.create({ data: { questionId: row.id, operation: 'AI_GENERATED', actorId: userId, snapshot, details: { batchId, sourcePage: unit.row.pageNumber } } });
        return row;
      });
      created.push(question);
    }
    if (!created.length) {
      throw new BadRequestException(
        'No additional unique questions could be generated from this selection. Choose a broader chapter/topic, add more textbook content, or select additional question types.',
      );
    }
    return { batchId, count: created.length, source: { processedTextbookId: document.id, textbookVersionId: document.textbookVersionId }, questions: created };
  }

  async list(schoolId: string, q: any) {
    const page = Math.max(Number(q.page) || 1, 1), pageSize = Math.min(Math.max(Number(q.pageSize) || 20, 1), 100);
    const where: Prisma.GameAIQuestionWhereInput = {
      schoolId, ...(q.status && { status: q.status }), ...(q.questionType && { questionType: q.questionType }),
      ...(q.difficulty && { difficulty: q.difficulty }), ...(q.processedTextbookId && { processedTextbookId: q.processedTextbookId }),
      ...(q.gameAssessmentId && { gameAssessmentId: q.gameAssessmentId }),
      ...(q.search && { questionText: { contains: q.search, mode: 'insensitive' } }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.gameAIQuestion.findMany({ where, include: this.include(), orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.gameAIQuestion.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async details(id: string, schoolId: string) {
    const row = await this.prisma.gameAIQuestion.findFirst({ where: { id, schoolId }, include: { ...this.include(), history: { orderBy: { createdAt: 'desc' } }, versions: { orderBy: { version: 'desc' } }, approvals: { orderBy: { reviewedAt: 'desc' } }, approvalHistory: { orderBy: { createdAt: 'desc' } }, drafts: { orderBy: { draftNumber: 'desc' } } } });
    if (!row) throw new NotFoundException('Game AI question not found.');
    return row;
  }

  async update(id: string, dto: UpdateGameQuestionDto, schoolId: string, userId: string) {
    const current = await this.details(id, schoolId);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.gameAIQuestion.update({ where: { id }, data: {
        questionText: dto.questionText, correctAnswer: dto.correctAnswer, explanation: dto.explanation,
        difficulty: dto.difficulty, questionType: dto.questionType, bloomLevel: dto.bloomLevel,
        learningOutcome: dto.learningOutcome, status: dto.status,
        ...(dto.options && { options: { deleteMany: {}, create: dto.options.map((option, sequence) => ({ ...option, isCorrect: !!option.isCorrect, sequence })) } }),
      }, include: { options: { orderBy: { sequence: 'asc' } } } });
      const version = current.versions.length + 1, snapshot = this.snapshot(updated);
      await tx.gameAIQuestionVersion.create({ data: { questionId: id, version, snapshot, createdById: userId } });
      await tx.gameAIQuestionHistory.create({ data: { questionId: id, operation: 'EDITED', actorId: userId, snapshot, details: { previousVersion: version - 1 } } });
      return updated;
    });
  }

  async remove(id: string, schoolId: string, userId: string) {
    const row = await this.details(id, schoolId);
    await this.prisma.$transaction([
      this.prisma.gameAIQuestion.update({ where: { id }, data: { status: 'ARCHIVED' } }),
      this.prisma.gameAIQuestionHistory.create({ data: { questionId: id, operation: 'ARCHIVED', actorId: userId, snapshot: this.snapshot(row) } }),
    ]);
    return { success: true };
  }

  async review(schoolId: string, q: any) {
    const result = await this.list(schoolId, { ...q, pageSize: q.pageSize || 100 });
    const grouped = await this.prisma.gameAIQuestion.groupBy({ by: ['status'], where: { schoolId }, _count: { _all: true } });
    return { ...result, counts: Object.fromEntries(grouped.map((row) => [row.status, row._count._all])) };
  }

  async reviewAction(questionIds: string[], status: 'APPROVED' | 'REJECTED', note: string | undefined, schoolId: string, userId: string) {
    const questions = await this.ownedMany(questionIds, schoolId);
    return this.prisma.$transaction(async (tx) => {
      for (const question of questions) {
        const snapshot = this.snapshot(question);
        await tx.gameAIQuestion.update({ where: { id: question.id }, data: { status } });
        await tx.gameQuestionApproval.create({ data: { questionId: question.id, status, reviewedById: userId, reviewNote: note } });
        await tx.gameQuestionApprovalHistory.create({ data: { questionId: question.id, fromStatus: question.status, toStatus: status, actorId: userId, note, snapshot } });
        await tx.gameAIQuestionHistory.create({ data: { questionId: question.id, operation: status, actorId: userId, snapshot, details: note ? { note } : undefined } });
      }
      return { success: true, status, count: questions.length };
    });
  }

  async saveDrafts(questionIds: string[], note: string | undefined, schoolId: string, userId: string) {
    const questions = await this.ownedMany(questionIds, schoolId);
    return this.prisma.$transaction(async (tx) => {
      for (const question of questions) {
        const draftNumber = await tx.gameQuestionDraft.count({ where: { questionId: question.id } }) + 1;
        const snapshot = this.snapshot(question);
        await tx.gameQuestionDraft.create({ data: { questionId: question.id, draftNumber, snapshot, savedById: userId } });
        await tx.gameAIQuestion.update({ where: { id: question.id }, data: { status: 'DRAFT' } });
        await tx.gameAIQuestionHistory.create({ data: { questionId: question.id, operation: 'DRAFT_SAVED', actorId: userId, snapshot, details: note ? { note } : undefined } });
      }
      return { success: true, status: 'DRAFT', count: questions.length };
    });
  }

  async bulkDelete(questionIds: string[], schoolId: string, userId: string) {
    const questions = await this.ownedMany(questionIds, schoolId);
    await this.prisma.$transaction(async (tx) => {
      for (const question of questions) {
        await tx.gameAIQuestion.update({ where: { id: question.id }, data: { status: 'ARCHIVED' } });
        await tx.gameAIQuestionHistory.create({ data: { questionId: question.id, operation: 'ARCHIVED', actorId: userId, snapshot: this.snapshot(question) } });
      }
    });
    return { success: true, count: questions.length, actorId: userId };
  }

  private async ownedMany(ids: string[], schoolId: string) {
    const unique = [...new Set(ids)];
    const rows = await this.prisma.gameAIQuestion.findMany({ where: { schoolId, id: { in: unique } }, include: { options: true } });
    if (rows.length !== unique.length) throw new BadRequestException('One or more selected questions are invalid for this school.');
    return rows;
  }

  private compose(source: string, type: string, difficulty: string, vocabulary: string[], index: number) {
    const cleanSource = this.cleanSource(source);
    const fraction = cleanSource.match(/fraction\s+(\d+)\s*\/\s*(\d+).*numerator\s+is\s+(\d+).*denominator\s+is\s+(\d+)/i);
    if (type === 'MCQ' && fraction) {
      const askNumerator = index % 2 === 0;
      const answer = askNumerator ? fraction[3] : fraction[4];
      const other = askNumerator ? fraction[4] : fraction[3];
      const options = this.uniqueOptions([answer, other, String(Number(answer) + Number(other)), String(Math.abs(Number(other) - Number(answer)) || 1)]);
      return this.choice(`In the fraction ${fraction[1]}/${fraction[2]}, what is the ${askNumerator ? 'numerator' : 'denominator'}?`, answer, options);
    }
    const namedNumber = cleanSource.match(/The\s+(top|bottom)\s+number\s+is\s+the\s+(numerator|denominator)/i);
    if (type === 'MCQ' && namedNumber) {
      const answer = namedNumber[2].toLowerCase();
      return this.choice(`What is the ${namedNumber[1].toLowerCase()} number of a fraction called?`, answer, [answer, answer === 'numerator' ? 'denominator' : 'numerator', 'fraction bar', 'whole number']);
    }
    const fractionKind = cleanSource.match(/A[n]?\s+(proper|improper)\s+fraction\s+has\s+(.+?)(?:,\s*such as|\.)/i);
    if (type === 'MCQ' && fractionKind) {
      const answer = fractionKind[1].toLowerCase();
      return this.choice(`Which type of fraction has ${fractionKind[2].trim()}?`, answer, [answer, answer === 'proper' ? 'improper' : 'proper', 'mixed', 'equivalent']);
    }
    if (type === 'MCQ' && /written using two numbers separated by a fraction bar/i.test(cleanSource)) {
      const answer = 'With two numbers separated by a fraction bar';
      return this.choice('How do we write a fraction?', answer, [
        answer,
        'With one whole number only',
        'With two numbers added together',
        'With a number and a letter',
      ]);
    }
    if (type === 'MCQ' && /numerator.*(?:shows|tells).*equal parts/i.test(cleanSource)) {
      const answer = 'How many equal parts are selected';
      return this.choice('What does the numerator show?', answer, [
        answer,
        'The total number of equal parts',
        'The name of the fraction',
        'The size of the page',
      ]);
    }
    if (type === 'MCQ' && /denominator.*(?:shows|tells).*total.*equal parts/i.test(cleanSource)) {
      const answer = 'The total number of equal parts';
      return this.choice('What does the denominator show?', answer, [
        answer,
        'How many parts are selected',
        'The answer to an addition',
        'The name of the fraction',
      ]);
    }
    if (type === 'MCQ' && /fraction bar.*separat/i.test(cleanSource)) {
      const answer = 'The numerator and denominator';
      return this.choice('What does the fraction bar separate?', answer, [
        answer,
        'Two whole numbers',
        'A number and a letter',
        'Two addition signs',
      ]);
    }
    if (type === 'MCQ' && /fraction.*part of a whole/i.test(cleanSource)) {
      const answer = 'A part of a whole';
      return this.choice('What does a fraction show?', answer, [
        answer,
        'Only a whole number',
        'A unit of time',
        'A type of angle',
      ]);
    }
    if (type === 'MCQ' && /fractions with the same denominator.*compar(?:e|ed).*numerator/i.test(cleanSource)) {
      const answer = 'Their numerators';
      return this.choice('When fractions have the same denominator, which part should you compare?', answer, [
        answer,
        'Their denominators',
        'Their fraction bars',
        'Their whole numbers',
      ]);
    }
    if (type === 'MCQ' && /fractions with the same numerator.*(?:smaller|less).*denominator.*greater/i.test(cleanSource)) {
      const answer = 'The fraction with the smaller denominator';
      return this.choice('Two fractions have the same numerator. Which fraction is greater?', answer, [
        answer,
        'The fraction with the larger denominator',
        'Both fractions are always equal',
        'The fraction with the longer fraction bar',
      ]);
    }
    const fractionComparison = cleanSource.match(/(\d+\s*\/\s*\d+)\s+is\s+(greater|less|smaller)\s+than\s+(\d+\s*\/\s*\d+)/i);
    if (type === 'MCQ' && fractionComparison) {
      const first = fractionComparison[1].replace(/\s+/g, '');
      const second = fractionComparison[3].replace(/\s+/g, '');
      const relation = fractionComparison[2].toLowerCase();
      const answer = relation === 'greater' ? first : second;
      return this.choice(`Which fraction is greater: ${first} or ${second}?`, answer, [
        answer,
        answer === first ? second : first,
        'They are equal',
        'Not enough information',
      ]);
    }
    const words = this.keywords(cleanSource);
    const answer = this.answerWord(cleanSource, words);
    const distractors = this.plausibleDistractors(answer, vocabulary, index);
    if (type === 'MCQ') {
      return this.choice(
        `What is this textbook sentence mainly about? ${cleanSource}`,
        answer,
        [answer, ...distractors],
      );
    }
    if (type === 'TRUE_FALSE') {
      const makeFalse = index % 2 === 1 && distractors[0];
      const statement = makeFalse ? cleanSource.replace(new RegExp(`\\b${this.escape(answer)}\\b`, 'i'), distractors[0]) : cleanSource;
      const correctAnswer = makeFalse ? 'False' : 'True';
      return this.choice(`True or false: ${statement}`, correctAnswer, ['True', 'False']);
    }
    if (type === 'FILL_IN_THE_BLANKS') {
      const blank = cleanSource.replace(new RegExp(`\\b${this.escape(answer)}\\b`, 'i'), '_____');
      return { questionText: blank, correctAnswer: answer, options: [] };
    }
    if (type === 'MATCH_THE_FOLLOWING') return { questionText: `Match the key term "${answer}" with the correct textbook statement.`, correctAnswer: source, options: [{ optionKey: 'A', optionText: `${answer} → ${source}`, isCorrect: true }] };
    if (type === 'ONE_WORD') return { questionText: `Give one key term from this textbook statement: ${source}`, correctAnswer: answer, options: [] };
    const lead = type === 'CASE_STUDY' ? 'Read this example and answer' : type === 'COMPETENCY' ? 'Use this idea to explain' : type === 'HOTS' ? 'Think carefully and explain' : type === 'LONG_ANSWER' ? 'Explain in detail' : 'Explain this idea in simple words';
    return { questionText: `${lead}: ${source}`, correctAnswer: source, options: [] };
  }

  private sentences(text: string) { return text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).map((x) => x.trim()); }
  private cleanSource(source: string) {
    return source
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^\d+(?:\.\d+)*\s+/, '')
      .replace(/^Comparing Fractions\s+(?=Fractions\b)/i, '')
      .replace(/\.\.+$/, '.')
      .slice(0, 220);
  }
  private keywords(text: string) { const stop = new Set(['about','after','again','also','because','been','before','being','between','called','could','from','have','into','more','most','other','over','said','separated','shows','such','tells','than','that','their','there','these','they','this','through','under','using','very','were','what','when','where','which','while','with','would','written','admissionsos','textbook','chapter','material','content','original','sample','class','topics']); return [...new Set((text.match(/[A-Za-z][A-Za-z'-]{3,}/g) || []).filter((word) => !stop.has(word.toLowerCase())))].slice(0, 100); }
  private isInstructional(text: string) {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (clean.length < 35 || clean.length > 260) return false;
    if (/AdmissionsOS|original sample|demo learning material|quiz answers|testing source-based|Page \d|Class \d|^Topics?:|copyright|table of contents/i.test(clean)) return false;
    if (!/[.!?]$/.test(clean)) return false;
    return (clean.match(/[A-Za-z]{3,}/g) || []).length >= 6;
  }
  private answerWord(source: string, words: string[]) {
    const definition = source.match(/\b(?:is|are|called|means)\s+(?:an?\s+|the\s+)?([A-Za-z][A-Za-z'-]{3,})/i);
    return definition?.[1] || words.find((word) => source.replace(new RegExp(`\\b${this.escape(word)}\\b`, 'gi'), '').length < source.length) || 'answer';
  }
  private plausibleDistractors(answer: string, vocabulary: string[], index: number) {
    const sameShape = vocabulary.filter((word) => word.toLowerCase() !== answer.toLowerCase() && Math.abs(word.length - answer.length) <= 4);
    const rotated = [...sameShape.slice(index % Math.max(sameShape.length, 1)), ...sameShape];
    return this.uniqueOptions(rotated).slice(0, 3);
  }
  private uniqueOptions(values: string[]) {
    return [...new Map(values.filter(Boolean).map((value) => [String(value).trim().toLowerCase(), String(value).trim()])).values()];
  }
  private choice(questionText: string, correctAnswer: string, values: string[]) {
    const options = this.uniqueOptions(values);
    return { questionText, correctAnswer, options: options.map((text, index) => ({ optionKey: String.fromCharCode(65 + index), optionText: text, isCorrect: text.toLowerCase() === correctAnswer.toLowerCase() })) };
  }
  private validDraft(draft: { questionText: string; correctAnswer: string; options: Array<{ optionText: string; isCorrect: boolean }> }) {
    if (draft.questionText.length < 15 || draft.questionText.includes('_____') && !draft.correctAnswer) return false;
    if (!draft.options.length) return true;
    return draft.options.length >= 2 && draft.options.filter((option) => option.isCorrect).length === 1
      && draft.options.some((option) => option.optionText.trim().toLowerCase() === draft.correctAnswer.trim().toLowerCase());
  }
  private bloom(type: string, difficulty: string) { if (type === 'HOTS' || difficulty === 'HARD') return 'ANALYZE'; if (['CASE_STUDY','COMPETENCY','LONG_ANSWER'].includes(type)) return 'APPLY'; return difficulty === 'EASY' ? 'REMEMBER' : 'UNDERSTAND'; }
  private escape(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  private fingerprint(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  private snapshot(row: any): Prisma.InputJsonValue { return JSON.parse(JSON.stringify({ questionText: row.questionText, correctAnswer: row.correctAnswer, explanation: row.explanation, difficulty: row.difficulty, questionType: row.questionType, bloomLevel: row.bloomLevel, learningOutcome: row.learningOutcome, status: row.status, options: row.options })); }
  private include() { return { options: { orderBy: { sequence: 'asc' as const } }, processedTextbook: { include: { textbookVersion: { include: { textbook: true } } } }, gameAssessment: true }; }
}
