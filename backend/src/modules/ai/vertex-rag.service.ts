import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GoogleAuth } from 'google-auth-library';
import { PDFParse } from 'pdf-parse';
import { PrismaService } from '../../prisma.service';

const SOURCE_UNAVAILABLE =
  'The requested information is not available in the uploaded document.';

type SourceMetadata = {
  sourceName?: string;
  grade?: string;
  subject?: string;
  chapter?: string;
};

type GroundedAssessmentRequest = {
  grade: string;
  subject: string;
  difficulty: string;
  questionCount: number;
  writtenQuestionCount?: number;
  chapter?: string;
  questionTypes?: string[];
};

@Injectable()
export class VertexRagService {
  private readonly auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  constructor(private readonly prisma: PrismaService) {}

  generationMode() {
    return {
      mode: this.isGoogleConfigured() ? 'GOOGLE_VERTEX' : 'DEMO_LOCAL',
      label: this.isGoogleConfigured()
        ? 'Google source-grounded generation'
        : 'Source-only Demo Mode',
    };
  }

  async listSources(schoolId: string) {
    return this.prisma.schoolAiSourceDocument.findMany({
      where: { library: { schoolId } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        sourceName: true,
        originalName: true,
        mimeType: true,
        fileSize: true,
        grade: true,
        subject: true,
        chapter: true,
        status: true,
        processingMode: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async uploadPdf(
    schoolId: string,
    uploadedById: string,
    file: Express.Multer.File,
    metadata: SourceMetadata,
  ) {
    if (!file) throw new BadRequestException('Select a PDF to upload.');
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF learning materials are supported.');
    }
    if (file.size > 50 * 1024 * 1024) {
      throw new BadRequestException('PDF learning materials must be 50 MB or smaller.');
    }
    if (!this.isGoogleConfigured()) {
      return this.uploadDemoPdf(schoolId, uploadedById, file, metadata);
    }

    const library = await this.ensureSchoolLibrary(schoolId);
    const document = await this.prisma.schoolAiSourceDocument.create({
      data: {
        libraryId: library.id,
        sourceName: metadata.sourceName?.trim() || file.originalname,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        grade: metadata.grade?.trim() || null,
        subject: metadata.subject?.trim() || null,
        chapter: metadata.chapter?.trim() || null,
        uploadedById,
      },
    });

    try {
      const ragFile = await this.uploadRagFile(
        library.ragCorpusName,
        file,
        document.sourceName,
      );
      const ragFileName = ragFile.ragFile?.name || ragFile.name;
      if (!ragFileName) {
        throw new Error('Google did not return the uploaded RAG file resource.');
      }
      return await this.prisma.schoolAiSourceDocument.update({
        where: { id: document.id },
        data: {
          ragFileName,
          status: 'READY',
          errorMessage: null,
        },
      });
    } catch (error) {
      const message = this.errorMessage(error);
      await this.prisma.schoolAiSourceDocument.update({
        where: { id: document.id },
        data: { status: 'FAILED', errorMessage: message },
      });
      throw new ServiceUnavailableException(
        `The PDF could not be processed by Google Vertex AI RAG Engine. ${message}`,
      );
    }
  }

  async deleteSource(schoolId: string, sourceId: string) {
    const source = await this.prisma.schoolAiSourceDocument.findFirst({
      where: { id: sourceId, library: { schoolId } },
    });
    if (!source) throw new BadRequestException('Source document was not found.');

    if (source.ragFileName) {
      await this.googleRequest(
        `${this.vertexBaseUrl('v1beta1')}/${source.ragFileName}`,
        { method: 'DELETE' },
      );
    }
    await this.prisma.schoolAiSourceDocument.delete({ where: { id: source.id } });
    return { success: true };
  }

  async generateAssessment(
    schoolId: string,
    dto: GroundedAssessmentRequest,
  ) {
    const library = await this.prisma.schoolAiSourceLibrary.findUnique({
      where: { schoolId },
      include: {
        documents: {
          where: {
            status: 'READY',
          },
          select: {
            ragFileName: true,
            extractedText: true,
            processingMode: true,
            grade: true,
            subject: true,
            chapter: true,
          },
        },
      },
    });

    const documents = (library?.documents || []).filter(
      (document) =>
        this.sourceFieldMatches(document.grade, dto.grade, 'grade') &&
        this.sourceFieldMatches(document.subject, dto.subject) &&
        (!dto.chapter?.trim() ||
          this.sourceFieldMatches(document.chapter, dto.chapter)),
    );

    if (!library || documents.length === 0) {
      throw new BadRequestException(
        'Upload and process a PDF learning material for this class and subject before generating an assessment.',
      );
    }

    const requestedCount = Math.max(1, Number(dto.questionCount) || 1);
    const demoDocuments = documents.filter(
      (document) =>
        document.processingMode === 'DEMO_LOCAL' && document.extractedText,
    );
    if (!this.isGoogleConfigured()) {
      if (demoDocuments.length === 0) {
        throw new BadRequestException(
          'Upload the demo PDF before generating a demo assessment.',
        );
      }
      return this.generateDemoAssessment(
        demoDocuments.map((document) => document.extractedText || '').join('\n'),
        dto,
        requestedCount,
      );
    }
    const requestedTypes = dto.questionTypes?.length
      ? dto.questionTypes.join(', ')
      : dto.writtenQuestionCount === undefined
        ? 'MCQ and WRITTEN'
        : `${requestedCount - dto.writtenQuestionCount} MCQ and ${dto.writtenQuestionCount} WRITTEN`;
    const chapterInstruction = dto.chapter?.trim()
      ? `Use only material from chapter or unit "${dto.chapter.trim()}".`
      : 'Use only relevant material retrieved from the uploaded school documents.';

    const prompt = `Generate exactly ${requestedCount} assessment questions.
Grade: ${dto.grade}
Subject: ${dto.subject}
Difficulty: ${dto.difficulty}
Question types: ${requestedTypes}
${chapterInstruction}

SOURCE-ONLY RULES:
- Use ONLY facts explicitly present in the retrieved school document context.
- Do not use general knowledge, internet knowledge, assumptions, or invented details.
- Every correct answer and explanation must be supported by the retrieved context.
- If the retrieved context is absent or insufficient, respond exactly: ${SOURCE_UNAVAILABLE}

Supported requested formats include MCQ, True/False, Fill in the Blanks, Match the Following, One Word, Short Answer, Long Answer, Essay, Case Study, HOTS, Reading Comprehension, Practice Test, Question Bank, and Revision Paper.
- Represent MCQ and Match the Following as type "MCQ".
- Represent True/False as type "MCQ" with options exactly ["True","False"].
- Represent all answer-writing formats as type "WRITTEN" with an empty options array.
- Preserve the requested format name in "format".

Return only a JSON array with this schema:
[{"type":"MCQ or WRITTEN","format":"requested format","questionText":"string","options":["2 or 4 options for MCQ; empty for WRITTEN"],"correctAnswer":"string","explanation":"string","marks":10}]
Do not include Markdown or commentary.`;

    const ragFileIds = documents
      .map((document) => document.ragFileName?.split('/').pop())
      .filter((id): id is string => Boolean(id));
    if (ragFileIds.length === 0) {
      throw new BadRequestException(
        'No processed source files are available for this class and subject.',
      );
    }
    const response = await this.generateWithRag(
      library.ragCorpusName,
      ragFileIds,
      prompt,
    );
    if (!response.grounded) {
      throw new BadRequestException(SOURCE_UNAVAILABLE);
    }
    const text = response.text.trim();
    if (text.includes(SOURCE_UNAVAILABLE)) {
      throw new BadRequestException(SOURCE_UNAVAILABLE);
    }

    let questions: unknown;
    try {
      questions = JSON.parse(
        text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim(),
      );
    } catch {
      throw new ServiceUnavailableException(
        'Google returned an invalid assessment format. Please try again.',
      );
    }
    if (!Array.isArray(questions) || questions.length !== requestedCount) {
      throw new ServiceUnavailableException(
        'Google did not return the requested number of grounded questions. Please try again.',
      );
    }

    return questions.map((question: any, index) => {
      const type = question?.type === 'MCQ' ? 'MCQ' : 'WRITTEN';
      const options =
        type === 'MCQ' && Array.isArray(question?.options)
          ? question.options.slice(0, 4).map(String)
          : [];
      const correctAnswer = String(question?.correctAnswer || '').trim();
      if (
        !String(question?.questionText || '').trim() ||
        !correctAnswer ||
        (type === 'MCQ' &&
          (![2, 4].includes(options.length) ||
            !options.includes(correctAnswer)))
      ) {
        throw new ServiceUnavailableException(
          'Google returned an incomplete grounded question. Please regenerate.',
        );
      }
      return {
        type,
        format: String(question?.format || type).trim(),
        questionText: String(question.questionText).trim(),
        options,
        correctAnswer,
        explanation: String(question.explanation || '').trim(),
        marks: Math.max(1, Number(question.marks) || 10),
        order: index,
      };
    });
  }

  private async ensureSchoolLibrary(schoolId: string) {
    const existing = await this.prisma.schoolAiSourceLibrary.findUnique({
      where: { schoolId },
    });
    if (existing) return existing;

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });
    if (!school) throw new BadRequestException('School tenant was not found.');
    const operation = await this.googleRequest<any>(
      `${this.vertexBaseUrl('v1')}/projects/${this.projectId()}/locations/${this.location()}/ragCorpora`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: `pehchaan-${schoolId}`,
          description: `Private source library for ${school.name}`,
        }),
      },
    );
    const result = operation.done
      ? operation
      : await this.waitForOperation(operation.name, 'v1');
    const ragCorpusName = result.response?.name;
    if (!ragCorpusName) {
      throw new ServiceUnavailableException(
        'Google did not return a RAG corpus resource.',
      );
    }
    return this.prisma.schoolAiSourceLibrary.upsert({
      where: { schoolId },
      create: { schoolId, ragCorpusName },
      update: {},
    });
  }

  private async uploadDemoPdf(
    schoolId: string,
    uploadedById: string,
    file: Express.Multer.File,
    metadata: SourceMetadata,
  ) {
    const parser = new PDFParse({ data: file.buffer });
    try {
      const parsed = await parser.getText();
      const extractedText = parsed.text?.replace(/\s+/g, ' ').trim();
      if (!extractedText || extractedText.length < 100) {
        throw new BadRequestException(
          'The PDF does not contain enough readable text for demo generation.',
        );
      }
      const library = await this.prisma.schoolAiSourceLibrary.upsert({
        where: { schoolId },
        create: {
          schoolId,
          ragCorpusName: `demo-local-${schoolId}`,
        },
        update: {},
      });
      return this.prisma.schoolAiSourceDocument.create({
        data: {
          libraryId: library.id,
          sourceName: metadata.sourceName?.trim() || file.originalname,
          originalName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          grade: metadata.grade?.trim() || null,
          subject: metadata.subject?.trim() || null,
          chapter: metadata.chapter?.trim() || null,
          uploadedById,
          extractedText,
          processingMode: 'DEMO_LOCAL',
          status: 'READY',
        },
        select: {
          id: true,
          sourceName: true,
          originalName: true,
          mimeType: true,
          fileSize: true,
          grade: true,
          subject: true,
          chapter: true,
          status: true,
          processingMode: true,
          errorMessage: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } finally {
      await parser.destroy();
    }
  }

  private generateDemoAssessment(
    source: string,
    dto: GroundedAssessmentRequest,
    requestedCount: number,
  ) {
    if (
      !/chapter 5:\s*fractions/i.test(source) ||
      !/equivalent fractions/i.test(source)
    ) {
      throw new BadRequestException(SOURCE_UNAVAILABLE);
    }
    const bank = [
      ['MCQ', 'Which number is the numerator in 3/5?', ['3', '5', '8', '15'], '3', 'The source states that the numerator in 3/5 is 3.'],
      ['MCQ', 'Which number is the denominator in 3/5?', ['3', '5', '2', '8'], '5', 'The source states that the denominator in 3/5 is 5.'],
      ['MCQ', 'Which fraction is equivalent to 1/2?', ['2/4', '2/3', '3/4', '1/3'], '2/4', 'The source gives 1/2 = 2/4 = 3/6.'],
      ['MCQ', 'What is 6/8 in simplest form?', ['3/4', '2/3', '4/5', '1/2'], '3/4', 'The source simplifies 6/8 to 3/4 by dividing both parts by 2.'],
      ['MCQ', 'Which fraction is greater?', ['5/8', '3/8', 'They are equal', 'Neither'], '5/8', 'With equal denominators, 5/8 is greater because 5 is greater than 3.'],
      ['MCQ', 'What is 2/7 + 3/7?', ['5/7', '5/14', '1/7', '6/7'], '5/7', 'For equal denominators, add the numerators and keep 7.'],
      ['MCQ', 'What is 1/2 + 1/3?', ['5/6', '2/5', '1/5', '2/6'], '5/6', 'The source rewrites the fractions as 3/6 and 2/6.'],
      ['MCQ', 'The denominator of a fraction may be zero.', ['True', 'False'], 'False', 'The source explicitly says that the denominator must not be zero.'],
      ['MCQ', 'A proper fraction has a numerator smaller than its denominator.', ['True', 'False'], 'True', 'This is the definition provided in the source.'],
      ['WRITTEN', 'Fill in the blank: Equivalent fractions have the same _____.', [], 'value', 'The source says equivalent fractions have the same value.'],
      ['WRITTEN', 'What should be found before adding fractions with different denominators?', [], 'A common denominator', 'The source instructs learners to rewrite them using a common denominator.'],
      ['WRITTEN', 'How much of the pie did Maya’s family eat?', [], '5/8', 'The source calculates 3/8 + 2/8 = 5/8.'],
      ['WRITTEN', 'How far did Arun walk in total?', [], '7/12 kilometre', 'The source calculates 4/12 + 3/12 = 7/12 kilometre.'],
      ['WRITTEN', 'Define an improper fraction.', [], 'A fraction whose numerator is greater than or equal to its denominator.', 'This definition is stated in the source.'],
      ['WRITTEN', 'What operation should not be performed on denominators when adding fractions?', [], 'Do not add the denominators.', 'The source highlights this as an important rule.'],
    ] as const;
    if (requestedCount > bank.length) {
      throw new BadRequestException(
        `Demo Mode supports up to ${bank.length} questions from this sample PDF.`,
      );
    }
    return bank.slice(0, requestedCount).map((item, order) => ({
      type: item[0],
      format: item[1].startsWith('Fill in') ? 'Fill in the Blanks' : item[0],
      questionText: item[1],
      options: [...item[2]],
      correctAnswer: item[3],
      explanation: item[4],
      marks: 10,
      order,
      generationMode: 'DEMO_LOCAL',
    }));
  }

  private async uploadRagFile(
    corpusName: string,
    file: Express.Multer.File,
    displayName: string,
  ) {
    const boundary = `pehchaan-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const metadata = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="metadata"\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({ ragFile: { displayName } })}\r\n`,
    );
    const fileHeader = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${this.safeFilename(file.originalname)}"\r\nContent-Type: application/pdf\r\n\r\n`,
    );
    const ending = Buffer.from(`\r\n--${boundary}--\r\n`);
    return this.googleRequest<any>(
      `${this.vertexUploadBaseUrl()}/${corpusName}/ragFiles:upload`,
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'X-Goog-Upload-Protocol': 'multipart',
        },
        body: Buffer.concat([metadata, fileHeader, file.buffer, ending]),
      },
    );
  }

  private async generateWithRag(
    corpusName: string,
    ragFileIds: string[],
    prompt: string,
  ) {
    const model = process.env.VERTEX_RAG_MODEL || 'gemini-2.5-flash';
    const result = await this.googleRequest<any>(
      `${this.vertexBaseUrl('v1')}/projects/${this.projectId()}/locations/${this.location()}/publishers/google/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          tools: [
            {
              retrieval: {
                vertexRagStore: {
                  ragResources: [{ ragCorpus: corpusName, ragFileIds }],
                  ragRetrievalConfig: { topK: 20 },
                },
              },
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
          },
        }),
      },
    );
    const candidate = result.candidates?.[0];
    const text = candidate?.content?.parts
      ?.map((part: any) => part.text || '')
      .join('');
    const chunks = candidate?.groundingMetadata?.groundingChunks || [];
    if (!text) {
      throw new ServiceUnavailableException(
        'Google did not return generated assessment content.',
      );
    }
    return { text, grounded: chunks.length > 0 };
  }

  private async waitForOperation(name: string, apiVersion: string) {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const operation = await this.googleRequest<any>(
        `${this.vertexBaseUrl(apiVersion)}/${name}`,
      );
      if (operation.done) {
        if (operation.error) {
          throw new ServiceUnavailableException(
            operation.error.message || 'Google operation failed.',
          );
        }
        return operation;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new ServiceUnavailableException('Google operation timed out.');
  }

  private async googleRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
    this.assertConfigured();
    const client = await this.auth.getClient();
    const accessToken = await client.getAccessToken();
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        ...(init.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ServiceUnavailableException(
        payload?.error?.message ||
          `Google Vertex AI request failed with status ${response.status}.`,
      );
    }
    return payload as T;
  }

  private vertexBaseUrl(apiVersion: string) {
    return `https://${this.location()}-aiplatform.googleapis.com/${apiVersion}`;
  }

  private vertexUploadBaseUrl() {
    return `https://${this.location()}-aiplatform.googleapis.com/upload/v1beta1`;
  }

  private projectId() {
    return process.env.GOOGLE_CLOUD_PROJECT || '';
  }

  private location() {
    return process.env.VERTEX_RAG_LOCATION || 'us-central1';
  }

  private assertConfigured() {
    if (!this.projectId()) {
      throw new ServiceUnavailableException(
        'Source-grounded assessment generation is not configured. Set GOOGLE_CLOUD_PROJECT and Google Application Default Credentials.',
      );
    }
  }

  private isGoogleConfigured() {
    return Boolean(this.projectId());
  }

  private sourceFieldMatches(
    sourceValue: string | null,
    requestedValue: string,
    field: 'grade' | 'text' = 'text',
  ) {
    // An omitted source tag intentionally makes the PDF available to all
    // grades/subjects/chapters.
    if (!sourceValue?.trim()) return true;

    const normalize = (value: string) =>
      value
        .trim()
        .toLocaleLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    let source = normalize(sourceValue);
    let requested = normalize(requestedValue);

    if (field === 'grade') {
      source = source.replace(/^(grade|class|standard|std)\s+/, '');
      requested = requested.replace(/^(grade|class|standard|std)\s+/, '');
    } else {
      const aliases: Record<string, string> = {
        math: 'mathematics',
        maths: 'mathematics',
        english: 'english literature',
        science: 'science and technology',
        'social science': 'social studies',
        'general awareness': 'general knowledge',
        gk: 'general knowledge',
      };
      source = aliases[source] || source;
      requested = aliases[requested] || requested;
    }

    return source === requested;
  }

  private safeFilename(name: string) {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown Google API error.';
  }
}
