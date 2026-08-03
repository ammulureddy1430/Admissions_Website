import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AIService } from '../ai/ai.service';
import { CreateAssessmentDto, QuestionDto } from './dto/create-assessment.dto';
import { SubmitAssessmentDto } from './dto/submit-assessment.dto';
import { ReviewAssessmentDto } from './dto/review-assessment.dto';
import { LogAssessmentEventDto, UpdateSecurityStatsDto } from './dto/log-event.dto';
import { Role } from '@prisma/client';
import { randomUUID } from 'crypto';

const BACKEND_SUBJECTS_BY_GRADE: Record<string, string[]> = {
  Nursery: ["Mathematics", "English Literature", "EVS", "General Knowledge"],
  LKG: ["Mathematics", "English Literature", "EVS", "General Knowledge"],
  UKG: ["Mathematics", "English Literature", "EVS", "General Knowledge"],
  "Grade 1": ["Mathematics", "English Literature", "EVS", "General Knowledge"],
  "Grade 2": ["Mathematics", "English Literature", "EVS", "General Knowledge"],
  "Grade 3": ["Mathematics", "English Literature", "Science & Technology", "Social Studies", "EVS", "General Knowledge"],
  "Grade 4": ["Mathematics", "English Literature", "Science & Technology", "Social Studies", "EVS", "General Knowledge"],
  "Grade 5": ["Mathematics", "English Literature", "Science & Technology", "Social Studies", "EVS", "General Knowledge"],
  "Grade 6": ["Mathematics", "English Literature", "Science & Technology", "Social Studies", "General Knowledge"],
  "Grade 7": ["Mathematics", "English Literature", "Science & Technology", "Social Studies", "General Knowledge"],
  "Grade 8": ["Mathematics", "English Literature", "Science & Technology", "Social Studies", "General Knowledge"],
  "Grade 9": ["Mathematics", "English Literature", "Science & Technology", "Social Studies", "General Knowledge"],
  "Grade 10": ["Mathematics", "English Literature", "Science & Technology", "Social Studies", "General Knowledge"],
};

@Injectable()
export class AssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) {}

  async create(dto: CreateAssessmentDto, schoolId: string) {
    const assessment = await this.prisma.assessment.create({
      data: {
        schoolId,
        title: dto.title,
        description: dto.description,
        instructions: dto.instructions,
        grade: dto.grade,
        subject: dto.subject,
        difficulty: dto.difficulty,
        questionCount: dto.questionCount,
        timeLimit: dto.timeLimit,
        totalMarks: dto.totalMarks,
        passingMarks: dto.passingMarks,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        allowCalculator: dto.allowCalculator ?? false,
        shuffleQuestions: dto.shuffleQuestions ?? false,
        shuffleOptions: dto.shuffleOptions ?? false,
        showResultImmediately: dto.showResultImmediately ?? false,
        allowRetake: dto.allowRetake ?? false,
        retakeCount: dto.retakeCount ?? 1,
        status: 'DRAFT',
        assessmentMode: dto.assessmentMode ?? 'HOME',
        proctoringEnabled: dto.proctoringEnabled ?? false,
        textbookId: dto.textbookId || null,
        textbookVersionId: dto.textbookVersionId || null,

        hasWritten: dto.hasWritten ?? true,
        hasReading: dto.hasReading ?? false,
        hasSpeaking: dto.hasSpeaking ?? false,
        hasListening: dto.hasListening ?? false,

        readingMaterialType: dto.readingMaterialType || null,
        readingMaterialUrl: dto.readingMaterialUrl || null,
        readingText: dto.readingText || null,
        readingTime: dto.readingTime || null,
        readingRecordDuration: dto.readingRecordDuration || null,
        readingInstructions: dto.readingInstructions || null,
        readingTotalMarks: dto.readingTotalMarks || null,
        readingPassingMarks: dto.readingPassingMarks || null,

        speakingActivityType: dto.speakingActivityType || null,
        speakingMaterialType: dto.speakingMaterialType || null,
        speakingMaterialUrl: dto.speakingMaterialUrl || null,
        speakingPrompt: dto.speakingPrompt || null,
        speakingPrepTime: dto.speakingPrepTime || null,
        speakingTimeLimit: dto.speakingTimeLimit || null,
        speakingTotalMarks: dto.speakingTotalMarks || null,
        speakingPassingMarks: dto.speakingPassingMarks || null,

        listeningActivityType: dto.listeningActivityType || null,
        listeningMaterialType: dto.listeningMaterialType || null,
        listeningMaterialUrl: dto.listeningMaterialUrl || null,
        listeningTranscript: dto.listeningTranscript || null,
        listeningInstructions: dto.listeningInstructions || null,
        listeningPlaysAllowed: dto.listeningPlaysAllowed ?? 1,
        listeningAudioSpeed: dto.listeningAudioSpeed ?? 1.0,
        listeningPrepTime: dto.listeningPrepTime || null,
        listeningDuration: dto.listeningDuration || null,
        listeningTotalMarks: dto.listeningTotalMarks || null,
        listeningPassingMarks: dto.listeningPassingMarks || null,
        listeningTimeLimit: dto.listeningTimeLimit || null,
      },
    });

    if (dto.questions && dto.questions.length > 0) {
      await this.prisma.assessmentQuestion.createMany({
        data: dto.questions.map((q, index) => ({
          assessmentId: assessment.id,
          type: q.type,
          questionText: q.questionText,
          options: (q.options || []) as any,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          marks: q.marks,
          order: q.order ?? index,
          isListening: q.isListening ?? false,
        })),
      });
    }

    return this.findOne(assessment.id, schoolId);
  }

  async findAll(schoolId: string, status?: string, grade?: string, subject?: string) {
    const templates = await this.prisma.assessment.findMany({
      where: {
        schoolId,
        applicationId: null, // Reusable templates
        ...(status && { status }),
        ...(grade && { grade }),
        ...(subject && { subject }),
      },
      include: {
        questions: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const enrichedTemplates = await Promise.all(
      templates.map(async (t) => {
        const copies = await this.prisma.assessment.findMany({
          where: {
            schoolId,
            applicationId: { not: null },
            title: t.title,
            grade: t.grade,
            subject: t.subject,
            archivedAt: null,
          },
          include: {
            submissions: {
              select: { status: true },
            },
            results: {
              select: { id: true },
            },
          },
        });

        const assignedCount = copies.length;
        const completedCount = copies.filter(
          (c) =>
            c.results.length > 0 ||
            c.submissions.some(
              (s) =>
                s.status === 'SUBMITTED' ||
                s.status === 'COMPLETED' ||
                s.status === 'PUBLISHED' ||
                s.status === 'EVALUATED',
            ),
        ).length;
        const pendingCount = assignedCount - completedCount;

        const slotSelectedCount = copies.length > 0 ? await this.prisma.studentSlotBooking.count({
          where: {
            assessmentId: { in: copies.map((c) => c.id) },
            bookingStatus: { in: ['BOOKED', 'RESCHEDULED', 'COMPLETED'] },
          },
        }) : 0;
        const pendingSlotSelectionCount = assignedCount - slotSelectedCount;

        return {
          ...t,
          assignedCount,
          completedCount,
          pendingCount,
          slotSelectedCount,
          pendingSlotSelectionCount,
        };
      }),
    );

    return enrichedTemplates;
  }

  async findOne(id: string, schoolId: string) {
    const assessment = await this.prisma.assessment.findFirst({
      where: { id, schoolId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment template not found.');
    }

    return {
      ...assessment,
      questions: assessment.questions.map(q => ({
        ...q,
        options: q.options as any,
      })),
    };
  }

  async update(id: string, dto: CreateAssessmentDto, schoolId: string) {
    const existing = await this.prisma.assessment.findFirst({
      where: { id, schoolId },
    });

    if (!existing) {
      throw new NotFoundException('Assessment not found.');
    }

    await this.prisma.assessment.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        instructions: dto.instructions,
        grade: dto.grade,
        subject: dto.subject,
        difficulty: dto.difficulty,
        questionCount: dto.questionCount,
        timeLimit: dto.timeLimit,
        totalMarks: dto.totalMarks,
        passingMarks: dto.passingMarks,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        allowCalculator: dto.allowCalculator ?? false,
        shuffleQuestions: dto.shuffleQuestions ?? false,
        shuffleOptions: dto.shuffleOptions ?? false,
        showResultImmediately: dto.showResultImmediately ?? false,
        allowRetake: dto.allowRetake ?? false,
        retakeCount: dto.retakeCount ?? 1,
        assessmentMode: dto.assessmentMode ?? 'HOME',
        proctoringEnabled: dto.proctoringEnabled ?? false,

        hasWritten: dto.hasWritten ?? true,
        hasReading: dto.hasReading ?? false,
        hasSpeaking: dto.hasSpeaking ?? false,
        hasListening: dto.hasListening ?? false,

        readingMaterialType: dto.readingMaterialType || null,
        readingMaterialUrl: dto.readingMaterialUrl || null,
        readingText: dto.readingText || null,
        readingTime: dto.readingTime || null,
        readingRecordDuration: dto.readingRecordDuration || null,
        readingInstructions: dto.readingInstructions || null,
        readingTotalMarks: dto.readingTotalMarks || null,
        readingPassingMarks: dto.readingPassingMarks || null,

        speakingActivityType: dto.speakingActivityType || null,
        speakingMaterialType: dto.speakingMaterialType || null,
        speakingMaterialUrl: dto.speakingMaterialUrl || null,
        speakingPrompt: dto.speakingPrompt || null,
        speakingPrepTime: dto.speakingPrepTime || null,
        speakingTimeLimit: dto.speakingTimeLimit || null,
        speakingTotalMarks: dto.speakingTotalMarks || null,
        speakingPassingMarks: dto.speakingPassingMarks || null,

        listeningActivityType: dto.listeningActivityType || null,
        listeningMaterialType: dto.listeningMaterialType || null,
        listeningMaterialUrl: dto.listeningMaterialUrl || null,
        listeningTranscript: dto.listeningTranscript || null,
        listeningInstructions: dto.listeningInstructions || null,
        listeningPlaysAllowed: dto.listeningPlaysAllowed ?? 1,
        listeningAudioSpeed: dto.listeningAudioSpeed ?? 1.0,
        listeningPrepTime: dto.listeningPrepTime || null,
        listeningDuration: dto.listeningDuration || null,
        listeningTotalMarks: dto.listeningTotalMarks || null,
        listeningPassingMarks: dto.listeningPassingMarks || null,
        listeningTimeLimit: dto.listeningTimeLimit || null,
      },
    });

    if (dto.questions) {
      // Clear old questions
      await this.prisma.assessmentQuestion.deleteMany({
        where: { assessmentId: id },
      });

      // Insert new questions
      await this.prisma.assessmentQuestion.createMany({
        data: dto.questions.map((q, index) => ({
          assessmentId: id,
          type: q.type,
          questionText: q.questionText,
          options: (q.options || []) as any,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          marks: q.marks,
          order: q.order ?? index,
          isListening: q.isListening ?? false,
        })),
      });
    }

    return this.findOne(id, schoolId);
  }

  async remove(id: string, schoolId: string) {
    const existing = await this.prisma.assessment.findFirst({
      where: { id, schoolId },
    });

    if (!existing) {
      throw new NotFoundException('Assessment not found.');
    }

    await this.prisma.assessment.delete({
      where: { id },
    });

    return { success: true };
  }

  async generateQuestions(
    dto: { grade: string; subject: string; difficulty: string; questionCount: number; writtenQuestionCount?: number; chapter?: string; questionTypes?: string[] },
    schoolId: string,
  ) {
    return this.aiService.generateGroundedAssessment(dto, schoolId);
  }

  async generateListeningQuestions(
    dto: {
      grade: string;
      subject: string;
      difficulty: string;
      activityType: string;
      transcript?: string;
      questionCount: number;
    },
    schoolId: string,
  ) {
    let transcriptToUse = dto.transcript || '';
    if (!transcriptToUse) {
      try {
        const textPrompt = `Generate a short listening exercise transcript suitable for Grade '${dto.grade}', Subject '${dto.subject}', Difficulty '${dto.difficulty}', and Activity Type '${dto.activityType}'. Keep it under 150 words. Do not include any formatting or questions, just the spoken text.`;
        const res = await this.aiService.chat(textPrompt, schoolId);
        transcriptToUse = res.response.trim();
      } catch (err) {
        transcriptToUse = "Hello students. Today we are going to learn about the solar system. The sun is at the center of the solar system, and eight planets orbit around it. Earth is the third planet from the sun and is the only planet known to support life.";
      }
    }

    const requestedCount = Math.max(1, Number(dto.questionCount) || 5);
    let generatedQuestions: any[] = [];
    const activity = String(dto.activityType || 'Listen and Answer Questions').toLowerCase();
    const isFillBlank = activity.includes('fill in the blank') || activity.includes('complete sentence');
    const isChooseAnswer = activity.includes('choose the correct answer');
    const isTrueFalse = activity.includes('true or false');
    const isMatching = activity.includes('match the following');
    const isStructuredWritten =
      activity.includes('sequence event') ||
      activity.includes('summarize') ||
      activity.includes('identify keyword') ||
      activity.includes('short question');

    const activityRule = isFillBlank
      ? 'Generate ONLY fill-in-the-blank sentences. Every questionText must contain a visible "_____" blank, type must be "WRITTEN", options must be [], and correctAnswer must contain the missing word or phrase.'
      : isChooseAnswer
        ? 'Generate ONLY multiple-choice questions. Every type must be "MCQ", every question must have exactly four plausible options, and correctAnswer must exactly match one option.'
      : isTrueFalse
          ? 'Generate ONLY true-or-false questions. Every type must be "MCQ", options must be exactly ["True", "False"], and correctAnswer must be either "True" or "False".'
          : isMatching
            ? `Generate ONLY matching questions. Create one left-side item per question using questionText in the form 'Match "[item]" with the correct description.' Every type must be "MCQ". Give exactly four right-side descriptions in options, and correctAnswer must exactly equal the matching description. Reuse the same four-description option bank when appropriate so the student can perform a real matching exercise.`
            : activity.includes('sequence event')
              ? 'Generate ONLY sequencing exercises. Every type must be "WRITTEN", questionText must list shuffled events to arrange, options must be [], and correctAnswer must provide the correct order.'
              : activity.includes('summarize')
                ? 'Generate ONLY summary prompts. Every type must be "WRITTEN", options must be [], and correctAnswer must provide a concise model summary.'
                : activity.includes('identify keyword')
                  ? 'Generate ONLY keyword-identification prompts. Every type must be "WRITTEN", options must be [], and correctAnswer must list the expected keywords.'
                  : activity.includes('short question')
                    ? 'Generate ONLY short-answer questions. Every type must be "WRITTEN", options must be [], and correctAnswer must be a brief answer found in the transcript.'
                    : 'Generate direct listening-comprehension questions. Use a suitable mix of "MCQ" and short "WRITTEN" questions.';

    const directListeningFallback = Array.from({ length: requestedCount }, (_, index) => {
      const sentences = transcriptToUse
        .replace(/\s+/g, ' ')
        .split(/(?<=[.!?])\s+/)
        .map(sentence => sentence.trim())
        .filter(sentence => sentence.length > 25);
      const sentence = sentences[index % Math.max(1, sentences.length)] || transcriptToUse.trim();
      const cleaned = sentence.replace(/^(welcome class[.!]?\s*|today\s+we\s+(?:will|are going to)\s+)/i, '').trim();
      const whenMatch = cleaned.match(/\bwhen\s+(.+?),\s*(.+?)[.!?]?$/i);
      const becauseMatch = cleaned.match(/^(.+?)\s+because\s+(.+?)[.!?]?$/i);
      const relationMatch = cleaned.match(/^(.+?)\s+(is|are|was|were|has|have|can|will)\s+(.+?)[.!?]?$/i);

      if (whenMatch) {
        return {
          type: 'WRITTEN',
          questionText: `According to the passage, what happens when ${whenMatch[1]}?`,
          options: [],
          correctAnswer: whenMatch[2].replace(/[.!?]+$/, ''),
          explanation: 'The answer is stated directly in the listening passage.',
          marks: 5,
        };
      }
      if (becauseMatch) {
        return {
          type: 'WRITTEN',
          questionText: `According to the passage, why ${becauseMatch[1].replace(/^(it|they)\s+/i, '')}?`,
          options: [],
          correctAnswer: becauseMatch[2].replace(/[.!?]+$/, ''),
          explanation: 'The passage provides this reason.',
          marks: 5,
        };
      }
      if (relationMatch) {
        return {
          type: 'WRITTEN',
          questionText: `What does the passage say about ${relationMatch[1].replace(/^(did you know that|the speaker says that)\s+/i, '')}?`,
          options: [],
          correctAnswer: `${relationMatch[2]} ${relationMatch[3]}`.replace(/[.!?]+$/, ''),
          explanation: 'The answer is stated directly in the listening passage.',
          marks: 5,
        };
      }
      const topic = cleaned.split(/\s+/).slice(0, 7).join(' ').replace(/[,:;.!?]+$/, '');
      return {
        type: 'WRITTEN',
        questionText: `What information does the speaker give about ${topic}?`,
        options: [],
        correctAnswer: cleaned.replace(/[.!?]+$/, ''),
        explanation: 'Use the corresponding detail from the listening passage.',
        marks: 5,
      };
    });

    try {
      const prompt = `You are an AI Question Generator. Based on the following listening transcript:
      "${transcriptToUse}"
      
      The teacher selected this exact activity: "${dto.activityType}".
      Generate exactly ${requestedCount} unique questions that strictly follow this activity.
      Mandatory format rule: ${activityRule}
      
      Return raw JSON in this format:
      [
        {
          "type": "MCQ" or "WRITTEN",
          "questionText": "string",
          "options": ["Option A", "Option B", "Option C", "Option D"] (empty array for WRITTEN),
          "correctAnswer": "string" (should match exactly one of options for MCQ, or provide baseline answer for WRITTEN),
          "explanation": "string",
          "marks": 5
        }
      ]
      
      Ensure every question is strictly based on the listening transcript. Do not substitute a different activity type.
      Do NOT wrap in markdown block backticks or add introductory text. Return only raw parsable JSON.`;

      const response = await this.aiService.chat(prompt, schoolId);
      const cleanedJson = response.response.replace(/```json/g, '').replace(/```/g, '').trim();
      generatedQuestions = JSON.parse(cleanedJson);
      if (!Array.isArray(generatedQuestions) || generatedQuestions.length === 0) {
        throw new Error('AI returned empty listening questions');
      }
    } catch (err) {
      console.error('Failed to generate listening questions:', err.message);
      generatedQuestions = Array.from({ length: requestedCount }, (_, index) => {
        if (isFillBlank) {
          const blanks = [
            { questionText: 'The sun is at the _____ of the solar system.', correctAnswer: 'center' },
            { questionText: '_____ planets orbit around the sun.', correctAnswer: 'Eight' },
            { questionText: 'Earth is the _____ planet from the sun.', correctAnswer: 'third' },
          ];
          return { type: 'WRITTEN', options: [], explanation: 'The missing phrase is stated in the transcript.', marks: 5, ...blanks[index % blanks.length] };
        }
        if (isMatching) {
          const matches = [
            { item: 'The Sun', answer: 'The star at the center of the solar system' },
            { item: 'Earth', answer: 'The third planet from the Sun' },
            { item: 'Eight', answer: 'The number of planets orbiting the Sun' },
            { item: 'Life', answer: 'What Earth is known to support' },
          ];
          const optionBank = matches.map(match => match.answer);
          const match = matches[index % matches.length];
          return { type: 'MCQ', questionText: `Match "${match.item}" with the correct description.`, options: optionBank, correctAnswer: match.answer, explanation: 'The matching relationship is stated in the transcript.', marks: 5 };
        }
        if (isChooseAnswer || isTrueFalse) {
          return isTrueFalse
            ? { type: 'MCQ', questionText: index % 2 ? 'Earth is the third planet from the sun.' : 'Nine planets orbit the sun.', options: ['True', 'False'], correctAnswer: index % 2 ? 'True' : 'False', explanation: 'The answer is stated in the transcript.', marks: 5 }
            : { type: 'MCQ', questionText: index % 2 ? 'Which planet is third from the sun?' : 'How many planets orbit the sun?', options: index % 2 ? ['Earth', 'Mars', 'Venus', 'Jupiter'] : ['Six', 'Seven', 'Eight', 'Nine'], correctAnswer: index % 2 ? 'Earth' : 'Eight', explanation: 'The answer is stated in the transcript.', marks: 5 };
        }
        if (activity.includes('sequence event')) {
          const sequenceTasks = [
            {
              questionText: 'Arrange these events in the order heard: (A) Earth is described as supporting life; (B) the Sun is introduced at the center; (C) eight planets are said to orbit the Sun; (D) Earth is identified as the third planet.',
              correctAnswer: 'B → C → D → A',
            },
            {
              questionText: 'Which order matches the passage? Write the letters in order: (A) Earth supports life; (B) eight planets orbit; (C) Earth is third from the Sun.',
              correctAnswer: 'B → C → A',
            },
            {
              questionText: 'Put these ideas in listening order: (A) number of planets; (B) location of the Sun; (C) Earth’s position.',
              correctAnswer: 'B → A → C',
            },
          ];
          const task = sequenceTasks[index % sequenceTasks.length];
          return { type: 'WRITTEN', options: [], explanation: 'The order follows the sequence of statements in the transcript.', marks: 5, ...task };
        }
        if (!isStructuredWritten) return directListeningFallback[index];
        return { type: 'WRITTEN', questionText: `Complete the selected "${dto.activityType}" task using detail ${index + 1} from the listening passage.`, options: [], correctAnswer: 'Answer based on the listening transcript.', explanation: 'Evaluate against the transcript.', marks: 5 };
      });
    }

    generatedQuestions = generatedQuestions.map((question, index) => {
      const normalized = {
        ...question,
        questionText: String(question.questionText || `Listening question ${index + 1}`),
        correctAnswer: String(question.correctAnswer || ''),
        explanation: String(question.explanation || 'Based on the listening transcript.'),
        marks: Number(question.marks) || 5,
      };
      if (isFillBlank) {
        return {
          ...normalized,
          type: 'WRITTEN',
          questionText: normalized.questionText.includes('_____')
            ? normalized.questionText
            : `${normalized.questionText} _____`,
          options: [],
        };
      }
      if (isChooseAnswer) {
        const options = Array.isArray(question.options) ? question.options.slice(0, 4).map(String) : [];
        while (options.length < 4) options.push(`Option ${options.length + 1}`);
        return { ...normalized, type: 'MCQ', options };
      }
      if (isTrueFalse) {
        return { ...normalized, type: 'MCQ', options: ['True', 'False'], correctAnswer: /^true$/i.test(normalized.correctAnswer) ? 'True' : 'False' };
      }
      if (isMatching) {
        const defaultOptions = [
          'The star at the center of the solar system',
          'The third planet from the Sun',
          'The number of planets orbiting the Sun',
          'What Earth is known to support',
        ];
        const options = Array.isArray(question.options) && question.options.length >= 2
          ? question.options.slice(0, 4).map(String)
          : defaultOptions;
        while (options.length < 4) options.push(defaultOptions[options.length]);
        const correctAnswer = options.includes(normalized.correctAnswer)
          ? normalized.correctAnswer
          : options[0];
        return {
          ...normalized,
          type: 'MCQ',
          questionText: /^match\b/i.test(normalized.questionText)
            ? normalized.questionText
            : `Match "${normalized.questionText}" with the correct description.`,
          options,
          correctAnswer,
        };
      }
      if (activity.includes('sequence event')) {
        const validSequencePrompt =
          /\([A-D]\)/.test(normalized.questionText) &&
          /\b(arrange|sequence|order)\b/i.test(normalized.questionText);
        const fallbackSequence = [
          {
            questionText: 'Arrange these events in the order heard: (A) Earth is described as supporting life; (B) the Sun is introduced at the center; (C) eight planets are said to orbit the Sun; (D) Earth is identified as the third planet.',
            correctAnswer: 'B → C → D → A',
          },
          {
            questionText: 'Which order matches the passage? Write the letters in order: (A) Earth supports life; (B) eight planets orbit; (C) Earth is third from the Sun.',
            correctAnswer: 'B → C → A',
          },
          {
            questionText: 'Put these ideas in listening order: (A) number of planets; (B) location of the Sun; (C) Earth’s position.',
            correctAnswer: 'B → A → C',
          },
        ][index % 3];
        return {
          ...normalized,
          type: 'WRITTEN',
          questionText: validSequencePrompt ? normalized.questionText : fallbackSequence.questionText,
          correctAnswer: validSequencePrompt ? normalized.correctAnswer : fallbackSequence.correctAnswer,
          options: [],
        };
      }
      if (activity.includes('summarize')) {
        return {
          ...normalized,
          type: 'WRITTEN',
          questionText: /\bsummar/i.test(normalized.questionText)
            ? normalized.questionText
            : `Summarize this part of the listening passage: ${normalized.questionText}`,
          options: [],
        };
      }
      if (activity.includes('identify keyword')) {
        return {
          ...normalized,
          type: 'WRITTEN',
          questionText: /\b(keyword|key word|identify)\b/i.test(normalized.questionText)
            ? normalized.questionText
            : `Identify the important keyword or phrase: ${normalized.questionText}`,
          options: [],
        };
      }
      if (activity.includes('short question')) {
        return {
          ...normalized,
          type: 'WRITTEN',
          questionText: normalized.questionText.endsWith('?')
            ? normalized.questionText
            : `${normalized.questionText.replace(/[.]+$/, '')}?`,
          options: [],
        };
      }
      if (isStructuredWritten) {
        return { ...normalized, type: 'WRITTEN', options: [] };
      }
      if (/\b(what important fact|detail\s+\d+|complete the selected)\b/i.test(normalized.questionText)) {
        return directListeningFallback[index];
      }
      return {
        ...normalized,
        type: normalized.type === 'MCQ' ? 'MCQ' : 'WRITTEN',
        options: normalized.type === 'MCQ' && Array.isArray(question.options) ? question.options : [],
      };
    });

    return {
      transcript: transcriptToUse,
      questions: generatedQuestions.slice(0, requestedCount).map((q, idx) => ({
        ...q,
        order: idx,
        isListening: true,
      })),
    };
  }

  async publish(dto: { assessmentId: string; applicationIds: string[]; dueDate: string; schedule?: any; slots?: any[]; autoBook?: boolean; notificationPreferences?: { parent?: boolean; student?: boolean; email?: boolean; sms?: boolean; inApp?: boolean } }, schoolId: string) {
    const template = await this.prisma.assessment.findFirst({
      where: { id: dto.assessmentId, schoolId },
      include: { questions: true },
    });

    if (!template) {
      throw new NotFoundException('Template assessment not found.');
    }

    // BOTH assessments must also keep an at-school schedule ready. Otherwise a
    // parent who chooses At School has no venue or slots to select.
    if (['SCHOOL', 'BOTH'].includes(template.assessmentMode) && dto.schedule && dto.slots) {
      const schedule = await this.prisma.assessmentSchedule.upsert({
        where: { assessmentId: dto.assessmentId },
        update: {
          assessmentDate: new Date(dto.schedule.assessmentDate),
          campus: dto.schedule.campus,
          building: dto.schedule.building,
          floor: dto.schedule.floor,
          roomNumber: dto.schedule.roomNumber,
          venue: dto.schedule.venue || '',
          instructions: dto.schedule.instructions || '',
          contactPerson: dto.schedule.contactPerson,
          contactPhone: dto.schedule.contactPhone,
          contactEmail: dto.schedule.contactEmail,
          documentsRequired: dto.schedule.documentsRequired || [],
          allowStudentRescheduling: dto.schedule.allowStudentRescheduling ?? false,
        },
        create: {
          assessmentId: dto.assessmentId,
          assessmentDate: new Date(dto.schedule.assessmentDate),
          campus: dto.schedule.campus,
          building: dto.schedule.building,
          floor: dto.schedule.floor,
          roomNumber: dto.schedule.roomNumber,
          venue: dto.schedule.venue || '',
          instructions: dto.schedule.instructions || '',
          contactPerson: dto.schedule.contactPerson,
          contactPhone: dto.schedule.contactPhone,
          contactEmail: dto.schedule.contactEmail,
          documentsRequired: dto.schedule.documentsRequired || [],
          allowStudentRescheduling: dto.schedule.allowStudentRescheduling ?? false,
        },
      });

      // Re-sync slots
      await this.prisma.assessmentSlot.deleteMany({
        where: { assessmentScheduleId: schedule.id },
      });

      for (const slot of dto.slots) {
        await this.prisma.assessmentSlot.create({
          data: {
            assessmentScheduleId: schedule.id,
            slotName: slot.slotName,
            startTime: slot.startTime,
            endTime: slot.endTime,
            capacity: Number(slot.capacity),
            bookedCount: 0,
            status: 'AVAILABLE',
          },
        });
      }
    }

    const targetApplications = await this.prisma.application.findMany({
      where: { id: { in: dto.applicationIds }, schoolId },
      select: { id: true, studentFirstName: true, studentLastName: true, studentEmail: true, parentId: true },
    });
    const duplicateAssignments = await this.prisma.assessment.findMany({
      where: {
        schoolId,
        applicationId: { in: targetApplications.map(application => application.id) },
        title: template.title,
        grade: template.grade,
        subject: template.subject,
        archivedAt: null,
      },
      select: { applicationId: true },
    });
    const duplicateApplicationIds = new Set(
      duplicateAssignments.map(assessment => assessment.applicationId),
    );
    if (duplicateApplicationIds.size > 0) {
      const studentNames = targetApplications
        .filter(application => duplicateApplicationIds.has(application.id))
        .map(application => `${application.studentFirstName} ${application.studentLastName}`);
      throw new BadRequestException(
        `Assessment already assigned to: ${studentNames.join(', ')}.`,
      );
    }

    let autoBookSlot: any = null;
    if (dto.autoBook && template.assessmentMode === 'SCHOOL') {
      const scheduleRecord = await this.prisma.assessmentSchedule.findUnique({
        where: { assessmentId: dto.assessmentId },
      });
      if (scheduleRecord) {
        autoBookSlot = await this.prisma.assessmentSlot.findFirst({
          where: { assessmentScheduleId: scheduleRecord.id },
          orderBy: { id: 'asc' },
        });
      }
    }

    const createdAssessments = [];

    for (const appId of dto.applicationIds) {
      const app = await this.prisma.application.findFirst({
        where: { id: appId, schoolId },
      });

      if (!app) continue;
      if (!app.assessmentRequired) {
        throw new BadRequestException(
          `${app.studentFirstName} ${app.studentLastName} is marked Assessment Not Required and cannot be assigned an academic assessment.`,
        );
      }

      // Copy assessment template assigned to specific application
      const studentAss = await this.prisma.assessment.create({
        data: {
          schoolId,
          applicationId: appId,
          title: template.title,
          description: template.description,
          instructions: template.instructions,
          grade: template.grade,
          subject: template.subject,
          difficulty: template.difficulty,
          questionCount: template.questionCount,
          timeLimit: template.timeLimit,
          totalMarks: template.totalMarks,
          passingMarks: template.passingMarks,
          dueDate: new Date(dto.dueDate),
          allowCalculator: template.allowCalculator,
          shuffleQuestions: template.shuffleQuestions,
          shuffleOptions: template.shuffleOptions,
          showResultImmediately: template.showResultImmediately,
          allowRetake: template.allowRetake,
          retakeCount: template.retakeCount,
          status: 'PUBLISHED',
          assessmentMode: template.assessmentMode,
          proctoringEnabled: template.proctoringEnabled,
          hasWritten: template.hasWritten,
          hasReading: template.hasReading,
          hasSpeaking: template.hasSpeaking,
          hasListening: template.hasListening,
          readingMaterialType: template.readingMaterialType,
          readingMaterialUrl: template.readingMaterialUrl,
          readingText: template.readingText,
          readingTime: template.readingTime,
          readingRecordDuration: template.readingRecordDuration,
          readingInstructions: template.readingInstructions,
          readingTotalMarks: template.readingTotalMarks,
          readingPassingMarks: template.readingPassingMarks,
          speakingActivityType: template.speakingActivityType,
          speakingMaterialType: template.speakingMaterialType,
          speakingMaterialUrl: template.speakingMaterialUrl,
          speakingPrompt: template.speakingPrompt,
          speakingPrepTime: template.speakingPrepTime,
          speakingTimeLimit: template.speakingTimeLimit,
          speakingTotalMarks: template.speakingTotalMarks,
          speakingPassingMarks: template.speakingPassingMarks,
          listeningActivityType: template.listeningActivityType,
          listeningMaterialType: template.listeningMaterialType,
          listeningMaterialUrl: template.listeningMaterialUrl,
          listeningTranscript: template.listeningTranscript,
          listeningInstructions: template.listeningInstructions,
          listeningPlaysAllowed: template.listeningPlaysAllowed,
          listeningAudioSpeed: template.listeningAudioSpeed,
          listeningPrepTime: template.listeningPrepTime,
          listeningDuration: template.listeningDuration,
          listeningTotalMarks: template.listeningTotalMarks,
          listeningPassingMarks: template.listeningPassingMarks,
          listeningTimeLimit: template.listeningTimeLimit,
        },
      });

      // Create questions copies
      await this.prisma.assessmentQuestion.createMany({
        data: template.questions.map(q => ({
          assessmentId: studentAss.id,
          type: q.type,
          questionText: q.questionText,
          options: q.options as any,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          marks: q.marks,
          order: q.order,
          isListening: q.isListening,
        })),
      });

      // Create draft submission
      await this.prisma.assessmentSubmission.create({
        data: {
          assessmentId: studentAss.id,
          applicationId: appId,
          status: 'IN_PROGRESS',
        },
      });

      // Update application stage to 'ASSESSMENT'
      await this.prisma.application.update({
        where: { id: appId },
        data: {
          status: 'ASSESSMENT',
          ...(template.assessmentMode !== 'HOME'
            ? {
                assessmentAccessEnabled: true,
                accessCode:
                  app.accessCode ||
                  `STU-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`,
              }
            : {}),
        },
      });

      const collectionNote = dto.schedule?.documentCollectionNote?.trim();
      const notificationMessage = `A new assessment for "${template.subject}" has been assigned to ${app.studentFirstName} ${app.studentLastName}.${collectionNote ? ` Collection information: ${collectionNote}` : ''}`;
      if (dto.notificationPreferences?.parent !== false) {
        await this.prisma.assessmentNotification.create({
          data: {
            assessmentId: studentAss.id,
            userId: app.parentId,
            title: 'New Assessment Assigned',
            message: notificationMessage,
            type: 'ASSIGNED',
          },
        });
      }

      if (dto.notificationPreferences?.student && app.studentEmail) {
        const studentUser = await this.prisma.user.findUnique({
          where: { email: app.studentEmail },
          select: { id: true },
        });
        if (studentUser && studentUser.id !== app.parentId) {
          await this.prisma.assessmentNotification.create({
            data: {
              assessmentId: studentAss.id,
              userId: studentUser.id,
              title: 'New Assessment Assigned',
              message: notificationMessage,
              type: 'ASSIGNED',
            },
          });
        }
      }

      if (autoBookSlot) {
        await this.prisma.studentSlotBooking.create({
          data: {
            assessmentId: studentAss.id,
            studentId: appId,
            parentId: app.parentId,
            slotId: autoBookSlot.id,
            bookingStatus: 'BOOKED',
            attendanceStatus: 'PENDING',
          },
        });

        await this.prisma.assessmentSlot.update({
          where: { id: autoBookSlot.id },
          data: {
            bookedCount: { increment: 1 },
          },
        });
      }

      createdAssessments.push(studentAss);
    }

    return createdAssessments;
  }

  async getSubmissions(schoolId: string) {
    const [submissions, gameResults] = await Promise.all([
      this.prisma.assessmentSubmission.findMany({
        where: {
          assessment: { schoolId },
          status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'REVIEWED', 'PUBLISHED', 'EVALUATED'] },
        },
        include: {
          assessment: true,
          application: {
            select: {
              studentFirstName: true,
              studentLastName: true,
              grade: true,
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.gameResult.findMany({
        where: {
          status: 'COMPLETED',
          gameAssignment: { gameAssessment: { schoolId } },
        },
        include: {
          gameAssignment: {
            include: {
              gameAssessment: true,
              generatedGame: { include: { template: true } },
            },
          },
          runtimeSessions: {
            where: { status: 'COMPLETED' },
            orderBy: { completedAt: 'desc' },
            take: 1,
          },
          attempts: {
            orderBy: { attemptNumber: 'desc' },
            take: 1,
            include: { scores: true },
          },
        },
        orderBy: { completedAt: 'desc' },
      }),
    ]);

    const studentIds = [...new Set(gameResults.map((result) => result.studentId))];
    const gameQuestionIds = [...new Set(gameResults.flatMap((result) => result.runtimeSessions[0]?.questionIds || []))];
    const [students, gameQuestions] = await Promise.all([
      studentIds.length
        ? this.prisma.application.findMany({
          where: { schoolId, id: { in: studentIds } },
          select: { id: true, studentFirstName: true, studentLastName: true, grade: true },
        })
        : Promise.resolve([]),
      gameQuestionIds.length
        ? this.prisma.gameAIQuestion.findMany({
          where: { schoolId, id: { in: gameQuestionIds } },
          include: { options: { orderBy: { sequence: 'asc' } } },
        })
        : Promise.resolve([]),
    ]);
    const studentById = new Map(students.map((student) => [student.id, student]));
    const gameQuestionById = new Map(gameQuestions.map((question) => [question.id, question]));
    const gameSubmissions = gameResults.map((result) => {
      const session = result.runtimeSessions[0];
      const runtime = (session?.runtimeState || {}) as Record<string, any>;
      const security = (runtime.security || {}) as Record<string, number>;
      const assessment = result.gameAssignment.gameAssessment;
      const score = result.attempts[0]?.scores[0];
      return {
        id: `game:${result.id}`,
        submissionType: 'GAME',
        status: 'EVALUATED',
        submittedAt: result.completedAt,
        timeTaken: score?.timeTaken ?? session?.elapsedSeconds ?? 0,
        totalWarnings: Number(security.totalWarnings || 0),
        tabSwitchCount: Number(security.tabSwitchCount || 0),
        fullscreenExitCount: Number(security.fullscreenExitCount || 0),
        submissionReason: Number(security.totalWarnings || 0) >= 3 ? 'FORCE_SUBMIT' : 'NORMAL',
        application: studentById.get(result.studentId) || {
          studentFirstName: 'Student',
          studentLastName: '',
          grade: assessment.grade,
        },
        assessment: {
          id: assessment.id,
          title: assessment.name,
          subject: assessment.subject,
          grade: assessment.grade,
        },
        gameResult: {
          id: result.id,
          gameName: result.gameAssignment.generatedGame?.title || result.gameAssignment.generatedGame?.template?.name || 'Game assessment',
          engineKey: result.gameAssignment.generatedGame?.engineKey,
          score: result.totalScore,
          percentage: result.percentage,
          passed: result.passed,
          completedAt: result.completedAt,
          correct: Number(runtime.correct || 0),
          incorrect: Number(runtime.incorrect || 0),
          answered: Array.isArray(runtime.answers) ? runtime.answers.length : 0,
          aiReview: ((result.attempts[0]?.state || {}) as Record<string, any>).aiReview || null,
          review: (session?.questionIds || []).map((questionId: string, index: number) => {
            const question = gameQuestionById.get(questionId);
            const answer = Array.isArray(runtime.answers)
              ? runtime.answers.find((row: any) => row.questionId === questionId)
              : null;
            return {
              number: index + 1,
              questionId,
              questionText: question?.questionText || 'Question unavailable',
              options: question?.options?.map((option) => ({
                key: option.optionKey,
                text: option.optionText,
              })) || [],
              studentAnswer: answer?.answer || 'Not answered',
              correctAnswer: question?.correctAnswer || '',
              correct: Boolean(answer?.correct),
              points: Number(answer?.points || 0),
              timeTaken: Number(answer?.timeTaken || 0),
              explanation: question?.explanation || null,
            };
          }),
        },
      };
    });

    return [...submissions.map((submission) => ({ ...submission, submissionType: 'STANDARD' })), ...gameSubmissions]
      .sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
  }

  async aiReviewGameSubmission(id: string, schoolId: string) {
    const result = await this.prisma.gameResult.findFirst({
      where: { id, status: 'COMPLETED', gameAssignment: { gameAssessment: { schoolId } } },
      include: {
        gameAssignment: { include: { gameAssessment: true, generatedGame: true } },
        runtimeSessions: { where: { status: 'COMPLETED' }, orderBy: { completedAt: 'desc' }, take: 1 },
        attempts: { orderBy: { attemptNumber: 'desc' }, take: 1 },
      },
    });
    if (!result) throw new NotFoundException('Completed game submission not found.');
    const session = result.runtimeSessions[0];
    const attempt = result.attempts[0];
    if (!session || !attempt) throw new BadRequestException('Saved game attempt details are unavailable.');
    const runtime = (session.runtimeState || {}) as Record<string, any>;
    const questions = await this.prisma.gameAIQuestion.findMany({
      where: { schoolId, id: { in: session.questionIds } },
    });
    const questionById = new Map(questions.map((question) => [question.id, question]));
    const answerRows = (Array.isArray(runtime.answers) ? runtime.answers : []).map((answer: any) => {
      const question = questionById.get(answer.questionId);
      return {
        questionId: answer.questionId,
        question: question?.questionText || 'Question unavailable',
        studentAnswer: answer.answer || 'Not answered',
        expectedAnswer: question?.correctAnswer || '',
        correct: Boolean(answer.correct),
        points: Number(answer.points || 0),
        timeTaken: Number(answer.timeTaken || 0),
      };
    });
    const assessment = result.gameAssignment.gameAssessment;
    const fallback = {
      overallSummary: result.passed
        ? `The student demonstrated a satisfactory understanding of ${assessment.subject}, answering ${Number(runtime.correct || 0)} of ${session.questionIds.length} questions correctly.`
        : `The student needs additional support in ${assessment.subject}, particularly on the concepts missed in this game assessment.`,
      strengths: answerRows.filter((row) => row.correct).slice(0, 3).map((row) => `Correctly answered: ${row.question}`),
      improvementAreas: answerRows.filter((row) => !row.correct).slice(0, 3).map((row) => `Review: ${row.question}`),
      teacherRemarks: result.passed
        ? 'Reinforce the successful concepts and provide one extension activity.'
        : 'Re-teach the missed concepts with simple worked examples, then reassess.',
      recommendedStatus: result.passed ? 'PASS' : 'NEEDS_SUPPORT',
      questionFeedback: answerRows.map((row) => ({
        questionId: row.questionId,
        feedback: row.correct ? 'The selected answer matches the expected answer.' : `Review why the expected answer is "${row.expectedAnswer}".`,
      })),
    };
    let aiReview: any = fallback;
    try {
      const prompt = `Review this completed educational game assessment for a teacher.
Grade: ${assessment.grade}
Subject: ${assessment.subject}
Game: ${result.gameAssignment.generatedGame?.title || 'Game assessment'}
Score: ${result.totalScore}
Percentage: ${result.percentage}
Answers: ${JSON.stringify(answerRows)}

Return STRICT raw JSON with this shape:
{
  "overallSummary": "2 concise constructive sentences",
  "strengths": ["up to 3 specific strengths"],
  "improvementAreas": ["up to 3 specific improvement areas"],
  "teacherRemarks": "one practical next-step recommendation",
  "recommendedStatus": "PASS or NEEDS_SUPPORT",
  "questionFeedback": [{"questionId":"exact id","feedback":"one concise teacher-facing sentence"}]
}
Do not use markdown. Do not change the recorded score or correctness.`;
      const response = await this.aiService.chat(prompt, schoolId);
      const parsed = JSON.parse(response.response.replace(/```json/g, '').replace(/```/g, '').trim());
      aiReview = {
        ...fallback,
        ...parsed,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('AI game review failed; using deterministic review:', error);
      aiReview = { ...fallback, generatedAt: new Date().toISOString(), fallback: true };
    }
    await this.prisma.gameAttempt.update({
      where: { id: attempt.id },
      data: { state: { ...((attempt.state || {}) as Record<string, any>), aiReview } },
    });
    return aiReview;
  }

  async getSubmission(id: string, schoolId: string) {
    const sub = await this.prisma.assessmentSubmission.findFirst({
      where: {
        id,
        assessment: { schoolId },
      },
      include: {
        assessment: {
          include: {
            questions: { orderBy: { order: 'asc' } },
          },
        },
        answers: true,
        securityLogs: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!sub) {
      throw new NotFoundException('Submission not found.');
    }
    if (sub.status === 'IN_PROGRESS') {
      throw new BadRequestException('AI grading is only available after the student submits the assessment.');
    }

    if (sub.status === 'SUBMITTED') {
      await this.prisma.assessmentSubmission.update({
        where: { id: sub.id },
        data: { status: 'UNDER_REVIEW' },
      });
      sub.status = 'UNDER_REVIEW';
    }

    // Ensure all questions have answer rows
    for (const q of sub.assessment.questions) {
      const exists = sub.answers.some(a => a.questionId === q.id);
      if (!exists) {
        await this.prisma.assessmentAnswer.create({
          data: {
            submissionId: sub.id,
            questionId: q.id,
            selectedOption: null,
            writtenAnswer: null,
          },
        });
      }
    }

    // Re-fetch to include the newly created blank answers
    const updatedSub = await this.prisma.assessmentSubmission.findFirst({
      where: { id },
      include: {
        assessment: {
          include: {
            questions: { orderBy: { order: 'asc' } },
          },
        },
        answers: {
          include: {
            question: true,
          },
        },
        securityLogs: { orderBy: { createdAt: 'asc' } },
        application: {
          select: {
            studentFirstName: true,
            studentLastName: true,
            grade: true,
            parent: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!updatedSub) {
      throw new NotFoundException('Submission context not found.');
    }

    return {
      ...updatedSub,
      assessment: {
        ...updatedSub.assessment,
        questions: updatedSub.assessment.questions.map(q => ({
          ...q,
          options: q.options as any,
        })),
      },
    };
  }

  async review(dto: ReviewAssessmentDto, schoolId: string) {
    // 1. Grade answers
    for (const ans of dto.answers) {
      await this.prisma.assessmentAnswer.update({
        where: { id: ans.answerId },
        data: {
          marksObtained: ans.marksObtained,
          isCorrect: ans.isCorrect,
          teacherRemarks: ans.teacherRemarks,
        },
      });
    }

    // 2. Fetch submission and score aggregate
    const sub = await this.prisma.assessmentSubmission.findFirst({
      where: dto.submissionId
        ? { id: dto.submissionId, assessment: { schoolId } }
        : { answers: { some: { id: dto.answers[0]?.answerId } } },
      include: {
        assessment: true,
        application: true,
        answers: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!sub) {
      throw new NotFoundException('Submission context not found.');
    }

    // Update Reading/Speaking/Listening marks and remarks if provided
    if (dto.readingManualScore !== undefined || dto.readingTeacherRemarks !== undefined ||
        dto.speakingManualScore !== undefined || dto.speakingTeacherRemarks !== undefined ||
        dto.listeningManualScore !== undefined || dto.listeningTeacherRemarks !== undefined) {
      await this.prisma.assessmentSubmission.update({
        where: { id: sub.id },
        data: {
          ...(dto.readingManualScore !== undefined && { readingManualScore: dto.readingManualScore }),
          ...(dto.readingTeacherRemarks !== undefined && { readingTeacherRemarks: dto.readingTeacherRemarks }),
          ...(dto.speakingManualScore !== undefined && { speakingManualScore: dto.speakingManualScore }),
          ...(dto.speakingTeacherRemarks !== undefined && { speakingTeacherRemarks: dto.speakingTeacherRemarks }),
          ...(dto.listeningManualScore !== undefined && { listeningManualScore: dto.listeningManualScore }),
          ...(dto.listeningTeacherRemarks !== undefined && { listeningTeacherRemarks: dto.listeningTeacherRemarks }),
        },
      });
    }

    const totalMarks = sub.assessment.totalMarks;
    
    // Sum of written question answers (if hasWritten is true)
    let marksObtained = 0;
    if (sub.assessment.hasWritten) {
      const writtenAnswers = sub.answers.filter(a => !a.question?.isListening);
      marksObtained += writtenAnswers.reduce((acc, a) => acc + (a.marksObtained || 0), 0);
    }
    
    // Add Reading score
    if (sub.assessment.hasReading) {
      const readingTotal = sub.assessment.readingTotalMarks || 0;
      const readContribution = dto.readingManualScore !== undefined 
        ? dto.readingManualScore 
        : (sub.readingManualScore !== null 
            ? sub.readingManualScore 
            : (sub.readingAiScore ? (sub.readingAiScore / 100) * readingTotal : 0));
      
      marksObtained += readContribution;
    }

    // Add Speaking score
    if (sub.assessment.hasSpeaking) {
      const speakingTotal = sub.assessment.speakingTotalMarks || 0;
      const speakContribution = dto.speakingManualScore !== undefined 
        ? dto.speakingManualScore 
        : (sub.speakingManualScore !== null 
            ? sub.speakingManualScore 
            : (sub.speakingAiScore ? (sub.speakingAiScore / 100) * speakingTotal : 0));
      
      marksObtained += speakContribution;
    }

    // Add Listening score
    if (sub.assessment.hasListening) {
      const listeningTotal = sub.assessment.listeningTotalMarks || 0;
      const listenContribution = dto.listeningManualScore !== undefined 
        ? dto.listeningManualScore 
        : (sub.listeningManualScore !== null 
            ? sub.listeningManualScore 
            : (sub.listeningAiScore ? (sub.listeningAiScore / 100) * listeningTotal : 0));
      
      marksObtained += listenContribution;
    }

    const percentage = totalMarks > 0 ? (marksObtained / totalMarks) * 100 : 0;
    const correctCount = sub.answers.filter(a => a.isCorrect === true).length;
    const wrongCount = sub.answers.filter(a => a.isCorrect === false).length;

    // 3. Create or update result
    const publishedAt = dto.publish ? new Date() : null;
    const submissionStatus = dto.publish ? 'PUBLISHED' : 'REVIEWED';

    const result = await this.prisma.assessmentResult.upsert({
      where: {
        assessmentId_applicationId: {
          assessmentId: sub.assessmentId,
          applicationId: sub.applicationId,
        },
      },
      create: {
        assessmentId: sub.assessmentId,
        applicationId: sub.applicationId,
        score: marksObtained,
        percentage,
        correctCount,
        wrongCount,
        status: dto.status,
        remarks: dto.remarks,
        teacherComments: dto.remarks,
        publishedAt,
      },
      update: {
        score: marksObtained,
        percentage,
        correctCount,
        wrongCount,
        status: dto.status,
        remarks: dto.remarks,
        teacherComments: dto.remarks,
        publishedAt,
      },
    });

    // 4. Update submission status
    await this.prisma.assessmentSubmission.update({
      where: { id: sub.id },
      data: { status: submissionStatus },
    });

    // If publishing, update application stage and send notification
    if (dto.publish) {
      await this.prisma.application.update({
        where: { id: sub.applicationId },
        data: { status: dto.status === 'PASS' ? 'INTERVIEW_SCHEDULED' : 'ASSESSMENT' },
      });

      // 5. Notify Parent
      await this.prisma.assessmentNotification.create({
        data: {
          assessmentId: sub.assessmentId,
          userId: sub.application.parentId,
          title: 'Assessment Result Published',
          message: `Your assessment result for "${sub.assessment.title}" is now available. Score: ${marksObtained}/${totalMarks} (${dto.status}).`,
          type: 'RESULT_PUBLISHED',
        },
      });
    } else {
      // Notify Parent that assessment was reviewed
      await this.prisma.assessmentNotification.create({
        data: {
          assessmentId: sub.assessmentId,
          userId: sub.application.parentId,
          title: 'Assessment Reviewed',
          message: `The admissions officer has finished reviewing the assessment "${sub.assessment.title}". Results will be published shortly.`,
          type: 'REVIEWED',
        },
      });
    }

    return result;
  }

  // Parent Portal Methods
  async getParentAssessments(parentId: string) {
    const assessments = await this.prisma.assessment.findMany({
      where: {
        application: {
          parentId,
        },
        applicationId: {
          not: null,
        },
        status: {
          not: 'ARCHIVED',
        },
      },
      include: {
        application: {
          select: {
            studentFirstName: true,
            studentLastName: true,
          },
        },
        submissions: {
          orderBy: { createdAt: 'desc' },
        },
        results: {
          where: {
            publishedAt: { not: null },
          },
        },
        reassignmentRequests: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        slotBookings: {
          include: {
            slot: {
              include: {
                schedule: true,
              },
            },
          },
        },
      },
      orderBy: [{ applicationId: 'asc' }, { attemptNumber: 'desc' }, { createdAt: 'desc' }],
    });

    const templateSchedules = assessments.length
      ? await this.prisma.assessmentSchedule.findMany({
          where: {
            assessment: {
              schoolId: assessments[0].schoolId,
              applicationId: null,
              status: { not: 'ARCHIVED' },
            },
          },
          include: {
            assessment: { select: { title: true, grade: true, subject: true } },
          },
        })
      : [];
    const scheduleByTemplate = new Map(
      templateSchedules.map((schedule) => [
        `${schedule.assessment.title}::${schedule.assessment.grade}::${schedule.assessment.subject}`,
        schedule.assessmentDate,
      ]),
    );

    return assessments.map((assessment) => {
      const venueChoiceDeadline = assessment.dueDate
        ? new Date(assessment.dueDate.getTime() - 4 * 24 * 60 * 60 * 1000)
        : null;
      return {
        ...assessment,
        scheduledAssessmentDate: scheduleByTemplate.get(
          `${assessment.title}::${assessment.grade}::${assessment.subject}`,
        ) || null,
        venueChoiceDeadline,
        venueChoiceLocked:
          assessment.assessmentMode === 'BOTH' &&
          Boolean(venueChoiceDeadline && new Date() > venueChoiceDeadline),
      };
    });
  }

  async chooseParentAssessmentVenue(
    id: string,
    venueChoice: 'HOME' | 'SCHOOL',
    parentId: string,
  ) {
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id,
        application: { parentId },
        assessmentMode: 'BOTH',
        status: { not: 'ARCHIVED' },
      },
      include: {
        application: true,
        submissions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!assessment || !assessment.application) {
      throw new NotFoundException('Both-mode assessment was not found.');
    }
    if (!assessment.dueDate) {
      throw new BadRequestException(
        'The school must set an assessment date before a venue can be selected.',
      );
    }

    const deadline = new Date(
      assessment.dueDate.getTime() - 4 * 24 * 60 * 60 * 1000,
    );
    if (new Date() > deadline) {
      throw new BadRequestException(
        `The venue-selection deadline was ${deadline.toLocaleDateString('en-IN')}. Contact the school to request a change.`,
      );
    }
    if (assessment.submissions[0]?.startedAt) {
      throw new BadRequestException(
        'The venue cannot be changed after the assessment has started.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.assessment.update({
        where: { id: assessment.id },
        data: { venueChoice, venueChoiceSubmittedAt: new Date() },
      });

      if (venueChoice === 'SCHOOL') {
        await tx.application.update({
          where: { id: assessment.application!.id },
          data: {
            assessmentAccessEnabled: true,
            accessCode:
              assessment.application!.accessCode ||
              `STU-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`,
          },
        });
      } else {
        await tx.studentSlotBooking.updateMany({
          where: { assessmentId: assessment.id, bookingStatus: { not: 'CANCELLED' } },
          data: { bookingStatus: 'CANCELLED' },
        });
      }
    });

    return {
      assessmentId: assessment.id,
      venueChoice,
      venueChoiceDeadline: deadline,
      message:
        venueChoice === 'SCHOOL'
          ? 'At-school assessment selected. The school will provide the access code and slot details.'
          : 'At-home assessment selected. No access code is required.',
    };
  }

  async getParentAssessment(id: string, parentId: string) {
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id,
        application: {
          parentId,
        },
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
        submissions: {
          include: {
            answers: true,
          },
        },
        results: {
          where: {
            publishedAt: { not: null },
          },
        },
        slotBookings: {
          include: {
            slot: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found or unauthorized.');
    }

    return {
      ...assessment,
      questions: assessment.questions.map(q => ({
        ...q,
        options: q.options as any,
      })),
    };
  }

  async startParentAssessment(id: string, parentId: string) {
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id,
        application: {
          parentId,
        },
        assessmentMode: { in: ['HOME', 'BOTH'] },
      },
      include: {
        submissions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!assessment || assessment.submissions.length === 0) {
      throw new NotFoundException('Assessment or submission not found.');
    }

    if (
      assessment.assessmentMode === 'BOTH' &&
      assessment.venueChoice !== 'HOME'
    ) {
      throw new BadRequestException(
        'Select At Home as the assessment venue before starting this assessment.',
      );
    }

    const submission = assessment.submissions[0];
    if (submission.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Submission is already finalized.');
    }

    // updateMany makes repeated start requests safe: only the first request
    // establishes the deadline, while refreshes retain the original start.
    await this.prisma.assessmentSubmission.updateMany({
      where: {
        id: submission.id,
        status: 'IN_PROGRESS',
        startedAt: null,
      },
      data: {
        startedAt: new Date(),
      },
    });

    return this.getParentAssessment(id, parentId);
  }

  async saveParentAnswers(id: string, dto: SubmitAssessmentDto, parentId: string) {
    const ass = await this.prisma.assessment.findFirst({
      where: { id, application: { parentId }, OR: [{ assessmentMode: 'HOME' }, { assessmentMode: 'BOTH', venueChoice: 'HOME' }] },
      include: { submissions: true },
    });

    if (!ass || ass.submissions.length === 0) {
      throw new NotFoundException('Active submission not found.');
    }

    const sub = ass.submissions[0];

    if (sub.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Submission is already finalized.');
    }

    // Upsert answers
    for (const ans of dto.answers) {
      await this.prisma.assessmentAnswer.upsert({
        where: {
          submissionId_questionId: {
            submissionId: sub.id,
            questionId: ans.questionId,
          },
        },
        create: {
          submissionId: sub.id,
          questionId: ans.questionId,
          selectedOption: ans.selectedOption,
          writtenAnswer: ans.writtenAnswer,
          fileUrl: ans.fileUrl,
          fileName: ans.fileName,
        },
        update: {
          selectedOption: ans.selectedOption,
          writtenAnswer: ans.writtenAnswer,
          fileUrl: ans.fileUrl,
          fileName: ans.fileName,
        },
      });
    }

    // Also update readingAudioUrl, speakingVideoUrl and listening fields if provided!
    if (dto.readingAudioUrl !== undefined || dto.speakingVideoUrl !== undefined || dto.listeningPlaysUsed !== undefined || dto.listeningTimeTaken !== undefined) {
      await this.prisma.assessmentSubmission.update({
        where: { id: sub.id },
        data: {
          ...(dto.readingAudioUrl !== undefined && { readingAudioUrl: dto.readingAudioUrl }),
          ...(dto.speakingVideoUrl !== undefined && { speakingVideoUrl: dto.speakingVideoUrl }),
          ...(dto.listeningPlaysUsed !== undefined && { listeningPlaysUsed: dto.listeningPlaysUsed }),
          ...(dto.listeningTimeTaken !== undefined && { listeningTimeTaken: dto.listeningTimeTaken }),
        },
      });
    }

    return { success: true };
  }

  async submitParentAssessment(id: string, dto: SubmitAssessmentDto, parentId: string) {
    const existing = await this.prisma.assessment.findFirst({
      where: { id, application: { parentId }, OR: [{ assessmentMode: 'HOME' }, { assessmentMode: 'BOTH', venueChoice: 'HOME' }] },
      include: { submissions: true },
    });

    if (!existing || existing.submissions.length === 0) {
      throw new NotFoundException('Submission context not found.');
    }

    if (existing.submissions[0].status !== 'IN_PROGRESS') {
      return {
        success: true,
        alreadySubmitted: true,
        autoEvaluated: existing.submissions[0].status === 'EVALUATED',
      };
    }

    // 1. Save final answers
    await this.saveParentAnswers(id, dto, parentId);

    const ass = await this.prisma.assessment.findFirst({
      where: { id, application: { parentId }, OR: [{ assessmentMode: 'HOME' }, { assessmentMode: 'BOTH', venueChoice: 'HOME' }] },
      include: {
        questions: true,
        submissions: {
          include: {
            answers: true,
          },
        },
        application: {
          include: {
            school: true,
          },
        },
      },
    });

    if (!ass || ass.submissions.length === 0) {
      throw new NotFoundException('Submission context not found.');
    }

    const sub = ass.submissions[0];

    // 2. Perform Auto-Evaluation for Objective MCQ Questions
    let autoScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let hasSubjective = ass.hasReading || ass.hasSpeaking || ass.hasListening;

    for (const q of ass.questions) {
      const parentAns = sub.answers.find(a => a.questionId === q.id);
      if (!parentAns) {
        if (q.type !== 'MCQ') {
          hasSubjective = true;
        }
        continue;
      }
      
      if (q.type === 'MCQ') {
        const isCorrect = parentAns.selectedOption === q.correctAnswer;
        const marksObtained = isCorrect ? q.marks : 0;
        
        await this.prisma.assessmentAnswer.update({
          where: { id: parentAns.id },
          data: {
            isCorrect,
            marksObtained,
          },
        });

        autoScore += marksObtained;
        if (isCorrect) correctCount++;
        else wrongCount++;
      } else {
        hasSubjective = true;
      }
    }

    // 3. Perform AI Evaluation for Reading, Speaking, and Listening if enabled
    let readingAiScore: number | null = null;
    let readingEvaluation: any = null;
    let speakingAiScore: number | null = null;
    let speakingEvaluation: any = null;
    let listeningAiScore: number | null = null;
    let listeningEvaluation: any = null;

    if (ass.hasReading) {
      const audioUrl = dto.readingAudioUrl || sub.readingAudioUrl;
      if (audioUrl) {
        try {
          const evalResult = await this.aiService.evaluateReading(ass.readingText || "", audioUrl, ass.schoolId);
          readingEvaluation = evalResult;
          readingAiScore = evalResult.overallScore;
        } catch (err) {
          console.error("AI Reading Evaluation during submission failed:", err);
        }
      }
    }

    if (ass.hasSpeaking) {
      const videoUrl = dto.speakingVideoUrl || sub.speakingVideoUrl;
      if (videoUrl) {
        try {
          const evalResult = await this.aiService.evaluateSpeaking(ass.speakingActivityType || "", ass.speakingPrompt || "", videoUrl, ass.schoolId);
          speakingEvaluation = evalResult;
          speakingAiScore = evalResult.overallScore;
        } catch (err) {
          console.error("AI Speaking Evaluation during submission failed:", err);
        }
      }
    }

    if (ass.hasListening) {
      const listeningQuestions = ass.questions.filter(q => q.isListening);
      const listeningAnswers = sub.answers.filter(a => listeningQuestions.some(q => q.id === a.questionId));
      const playsUsed = dto.listeningPlaysUsed ?? sub.listeningPlaysUsed;
      const listenTimeTaken = dto.listeningTimeTaken ?? sub.listeningTimeTaken ?? 0;
      if (ass.listeningTranscript && playsUsed > 0 && listeningAnswers.length > 0) {
        try {
        const evalResult = await this.aiService.evaluateListening(
          ass.listeningTranscript,
          listeningQuestions,
          listeningAnswers,
          playsUsed,
          listenTimeTaken,
          ass.schoolId
        );
        listeningEvaluation = evalResult;
        listeningAiScore = evalResult.overallScore;
        } catch (err) {
          console.error("AI Listening Evaluation during submission failed:", err);
        }
      }
    }

    const submittedAt = new Date();
    const timeTaken = sub.startedAt
      ? Math.max(0, Math.round((submittedAt.getTime() - sub.startedAt.getTime()) / 1000))
      : 0;

    await this.prisma.assessmentSubmission.update({
      where: { id: sub.id },
      data: {
        status: hasSubjective ? 'SUBMITTED' : 'EVALUATED',
        submittedAt,
        timeTaken,
        submissionReason: dto.submissionReason || 'NORMAL',
        ...(ass.hasReading && {
          readingAudioUrl: dto.readingAudioUrl || sub.readingAudioUrl,
          readingAiScore,
          readingEvaluation: readingEvaluation || undefined,
        }),
        ...(ass.hasSpeaking && {
          speakingVideoUrl: dto.speakingVideoUrl || sub.speakingVideoUrl,
          speakingAiScore,
          speakingEvaluation: speakingEvaluation || undefined,
        }),
        ...(ass.hasListening && {
          listeningPlaysUsed: dto.listeningPlaysUsed || sub.listeningPlaysUsed,
          listeningTimeTaken: dto.listeningTimeTaken || sub.listeningTimeTaken,
          listeningAiScore,
          listeningEvaluation: listeningEvaluation || undefined,
        }),
      },
    });

    if (!ass.applicationId) {
      throw new BadRequestException('Cannot submit template assessment.');
    }
    const applicationId = ass.applicationId;

    if (!ass.application) {
      throw new NotFoundException('Application not found.');
    }
    const application = ass.application;

    // 4. If all objective questions, publish results instantly!
    if (!hasSubjective) {
      const percentage = ass.totalMarks > 0 ? (autoScore / ass.totalMarks) * 100 : 0;
      const status = percentage >= ass.passingMarks ? 'PASS' : 'FAIL';

      await this.prisma.assessmentResult.create({
        data: {
          assessmentId: ass.id,
          applicationId,
          score: autoScore,
          percentage,
          correctCount,
          wrongCount,
          status,
          remarks: 'Auto-graded objective assessment.',
          teacherComments: 'Satisfied baseline objective assessment criteria.',
          publishedAt: new Date(),
        },
      });

      // Update application stage
      await this.prisma.application.update({
        where: { id: applicationId },
        data: { status: status === 'PASS' ? 'INTERVIEW_SCHEDULED' : 'ASSESSMENT' },
      });
    }

    // 5. Notify Admissions Staff
    const staffMembers = await this.prisma.user.findMany({
      where: {
        schoolId: ass.schoolId,
        role: Role.SCHOOL_ADMIN,
      },
    });

    for (const staff of staffMembers) {
      await this.prisma.assessmentNotification.create({
        data: {
          assessmentId: ass.id,
          userId: staff.id,
          title: 'Assessment Submitted',
          message: `${application.studentFirstName} ${application.studentLastName} submitted the ${ass.subject} Assessment.`,
          type: 'SUBMITTED',
        },
      });
    }

    return { success: true, autoEvaluated: !hasSubjective };
  }

  async logSecurityEvent(submissionId: string, dto: LogAssessmentEventDto, ipAddress: string) {
    return this.prisma.assessmentSecurityLog.create({
      data: {
        submissionId,
        eventType: dto.eventType,
        details: dto.details,
        ipAddress,
        browser: dto.browser,
        device: dto.device,
      },
    });
  }

  async updateSecurityStats(submissionId: string, dto: UpdateSecurityStatsDto) {
    return this.prisma.assessmentSubmission.update({
      where: { id: submissionId },
      data: {
        ...(dto.totalWarnings !== undefined && { totalWarnings: dto.totalWarnings }),
        ...(dto.tabSwitchCount !== undefined && { tabSwitchCount: dto.tabSwitchCount }),
        ...(dto.fullscreenExitCount !== undefined && { fullscreenExitCount: dto.fullscreenExitCount }),
      },
    });
  }

  async getParentResult(id: string, parentId: string) {
    const result = await this.prisma.assessmentResult.findFirst({
      where: {
        assessmentId: id,
        publishedAt: { not: null },
        application: {
          parentId,
        },
      },
      include: {
        assessment: true,
      },
    });

    if (!result) {
      throw new NotFoundException('Result not published or not found.');
    }

    return result;
  }

  async requestReassessment(assessmentId: string, parentId: string, requestReason?: string) {
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        application: { parentId },
      },
      include: {
        application: true,
        submissions: { orderBy: { createdAt: 'desc' }, take: 1 },
        results: true,
      },
    });

    if (!assessment || !assessment.applicationId || assessment.submissions.length === 0) {
      throw new NotFoundException('Completed assessment attempt not found.');
    }
    const hasPublishedResult = assessment.results.some(result => result.publishedAt !== null);
    if (!hasPublishedResult) {
      throw new BadRequestException('Re-assessment can only be requested after results are published.');
    }

    const pending = await this.prisma.assessmentReassignmentRequest.findFirst({
      where: { applicationId: assessment.applicationId, status: 'PENDING' },
    });
    if (pending) {
      throw new BadRequestException('A re-assessment request is already pending approval.');
    }

    const approvedCount = await this.prisma.assessmentReassignmentRequest.count({
      where: {
        applicationId: assessment.applicationId,
        status: 'APPROVED',
        assessment: { subject: assessment.subject, title: assessment.title },
      },
    });
    if (approvedCount >= 1 || assessment.attemptNumber >= 2) {
      throw new BadRequestException('The one-time re-assessment limit has been reached.');
    }

    const request = await this.prisma.assessmentReassignmentRequest.create({
      data: {
        assessmentId: assessment.id,
        previousAttemptId: assessment.submissions[0].id,
        applicationId: assessment.applicationId,
        parentId,
        schoolId: assessment.schoolId,
        requestReason,
        auditLogs: {
          create: { action: 'REQUESTED', performedById: parentId, details: { attemptNumber: assessment.attemptNumber } },
        },
      },
    });

    await this.prisma.assessmentNotification.create({
      data: {
        assessmentId: assessment.id,
        userId: parentId,
        title: 'Re-Assessment Request Sent',
        message: 'Your re-assessment request has been sent to the school.',
        type: 'REASSESSMENT_REQUESTED',
      },
    });

    const staff = await this.prisma.user.findMany({
      where: { schoolId: assessment.schoolId, role: { in: [Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF] } },
      select: { id: true },
    });
    if (staff.length) {
      await this.prisma.assessmentNotification.createMany({
        data: staff.map(user => ({
          assessmentId: assessment.id,
          userId: user.id,
          title: 'New Re-Assessment Request',
          message: `New Re-Assessment Request received from ${assessment.application!.studentFirstName} ${assessment.application!.studentLastName}'s parent.`,
          type: 'REASSESSMENT_REQUESTED',
        })),
      });
    }

    return request;
  }

  async getReassignmentRequests(schoolId: string, status?: string) {
    return this.prisma.assessmentReassignmentRequest.findMany({
      where: { schoolId, ...(status && status !== 'ALL' ? { status } : {}) },
      include: {
        assessment: { include: { results: true } },
        previousAttempt: true,
        application: {
          select: {
            studentFirstName: true,
            studentLastName: true,
            grade: true,
            parent: { select: { firstName: true, lastName: true } },
          },
        },
        generatedAssessment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveReassignment(
    requestId: string,
    dto: { questionCount?: number; totalMarks?: number; timeLimit?: number; dueDate?: string; difficulty?: string; passingMarks?: number; questions?: any[]; hasWritten?: boolean; hasListening?: boolean; hasReading?: boolean; hasSpeaking?: boolean; proctoringEnabled?: boolean; readingText?: string; readingInstructions?: string; listeningActivityType?: string; listeningTranscript?: string; listeningInstructions?: string; speakingActivityType?: string; speakingPrompt?: string },
    schoolId: string,
    approvedById: string,
  ) {
    const request = await this.prisma.assessmentReassignmentRequest.findFirst({
      where: { id: requestId, schoolId },
      include: {
        assessment: { include: { questions: true } },
        previousAttempt: true,
        application: true,
      },
    });
    if (!request) throw new NotFoundException('Re-assessment request not found.');
    if (request.status !== 'PENDING') throw new BadRequestException('This request has already been processed.');

    const approvedCount = await this.prisma.assessmentReassignmentRequest.count({
      where: {
        applicationId: request.applicationId,
        status: 'APPROVED',
        assessment: { subject: request.assessment.subject, title: request.assessment.title },
      },
    });
    if (approvedCount >= 1 || request.assessment.attemptNumber >= 2) {
      throw new BadRequestException('The one-time re-assessment limit has been reached.');
    }

    const hasWritten = dto.hasWritten ?? request.assessment.hasWritten;
    const hasListening = dto.hasListening ?? request.assessment.hasListening;
    const hasReading = dto.hasReading ?? request.assessment.hasReading;
    const hasSpeaking = dto.hasSpeaking ?? request.assessment.hasSpeaking;
    if (![hasWritten, hasListening, hasReading, hasSpeaking].some(Boolean)) {
      throw new BadRequestException('Select at least one assessment component.');
    }
    const hasQuestionComponent = hasWritten || hasListening;
    const questionCount = hasQuestionComponent ? Math.max(1, dto.questionCount || request.assessment.questionCount) : 0;
    const totalMarks = dto.totalMarks || request.assessment.totalMarks;
    const difficulty = dto.difficulty || request.assessment.difficulty;
    const previousTexts = new Set(request.assessment.questions.map(q => q.questionText.trim().toLowerCase()));
    const generated = Array.isArray(dto.questions) && dto.questions.length
      ? dto.questions
      : hasWritten
        ? await this.generateQuestions({ grade: request.assessment.grade, subject: request.assessment.subject, difficulty, questionCount }, schoolId)
        : [];
    let freshQuestions = generated.filter(q => q?.questionText && !previousTexts.has(q.questionText.trim().toLowerCase()));
    if (hasQuestionComponent && freshQuestions.length < questionCount) {
      const alternatives = this.reassessmentFallbackQuestions(request.assessment.subject, request.assessment.grade, questionCount);
      freshQuestions = [...freshQuestions, ...alternatives.filter(q => !previousTexts.has(q.questionText.trim().toLowerCase()))]
        .filter((q, index, all) => all.findIndex(item => item.questionText === q.questionText) === index);
    }
    if (hasQuestionComponent && freshQuestions.length < questionCount) {
      throw new BadRequestException('Could not generate enough fresh questions. Please try approval again.');
    }
    freshQuestions = freshQuestions.slice(0, questionCount);

    const shuffledQuestions = [...freshQuestions].sort(() => Math.random() - 0.5);
    const selectedComponentCount = [hasWritten, hasListening, hasReading, hasSpeaking].filter(Boolean).length;
    const componentMarks = totalMarks / selectedComponentCount;
    const writtenQuestionsCount = shuffledQuestions.filter(question => !question.isListening).length;
    const listeningQuestionsCount = shuffledQuestions.filter(question => question.isListening).length;
    const nextAttempt = request.assessment.attemptNumber + 1;
    const now = new Date();

    return this.prisma.$transaction(async tx => {
      await tx.assessment.updateMany({
        where: { applicationId: request.applicationId, status: 'PUBLISHED' },
        data: { status: 'ARCHIVED', archivedAt: now },
      });

      const assessment = await tx.assessment.create({
        data: {
          schoolId,
          applicationId: request.applicationId,
          title: request.assessment.title,
          description: request.assessment.description,
          instructions: request.assessment.instructions,
          grade: request.assessment.grade,
          subject: request.assessment.subject,
          difficulty,
          questionCount,
          timeLimit: dto.timeLimit || request.assessment.timeLimit,
          totalMarks,
          passingMarks: dto.passingMarks ?? request.assessment.passingMarks,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : request.assessment.dueDate,
          allowCalculator: request.assessment.allowCalculator,
          shuffleQuestions: true,
          shuffleOptions: true,
          showResultImmediately: request.assessment.showResultImmediately,
          allowRetake: false,
          retakeCount: 1,
          assessmentMode: request.assessment.assessmentMode,
          proctoringEnabled:
            ['SCHOOL', 'BOTH'].includes(request.assessment.assessmentMode)
              ? (dto.proctoringEnabled ?? request.assessment.proctoringEnabled)
              : false,
          status: 'PUBLISHED',
          attemptNumber: nextAttempt,
          assessmentVersion: request.assessment.assessmentVersion + 1,
          previousAssessmentId: request.assessment.id,
          hasWritten,
          hasListening,
          hasReading,
          hasSpeaking,
          ...(hasReading && {
            readingMaterialType: request.assessment.readingMaterialType || 'PASSAGE',
            readingMaterialUrl: request.assessment.readingMaterialUrl,
            readingText: dto.readingText || request.assessment.readingText || 'Read the passage clearly and naturally. Focus on pronunciation, pace, expression, and accuracy.',
            readingTime: request.assessment.readingTime || 60,
            readingRecordDuration: request.assessment.readingRecordDuration || 60,
            readingInstructions: dto.readingInstructions || request.assessment.readingInstructions || 'Preview the passage, then read it aloud clearly into your microphone.',
            readingTotalMarks: componentMarks,
            readingPassingMarks: Math.round(componentMarks / 2),
          }),
          ...(hasSpeaking && {
            speakingActivityType: dto.speakingActivityType || request.assessment.speakingActivityType || 'Introduce Yourself',
            speakingMaterialType: request.assessment.speakingMaterialType || 'PROMPT',
            speakingMaterialUrl: request.assessment.speakingMaterialUrl,
            speakingPrompt: dto.speakingPrompt || request.assessment.speakingPrompt || 'Introduce yourself and explain your interests, goals, and what you hope to learn.',
            speakingPrepTime: request.assessment.speakingPrepTime || 60,
            speakingTimeLimit: request.assessment.speakingTimeLimit || 120,
            speakingTotalMarks: componentMarks,
            speakingPassingMarks: Math.round(componentMarks / 2),
          }),
          ...(hasListening && {
            listeningActivityType: dto.listeningActivityType || request.assessment.listeningActivityType || 'Listen and Answer Questions',
            listeningMaterialType: request.assessment.listeningMaterialType || 'AI_GEN',
            listeningMaterialUrl: request.assessment.listeningMaterialUrl,
            listeningTranscript: dto.listeningTranscript || request.assessment.listeningTranscript || 'The Sun is at the center of the solar system. Eight planets orbit the Sun. Earth is the third planet and is known to support life.',
            listeningInstructions: dto.listeningInstructions || request.assessment.listeningInstructions || 'Listen carefully, then answer the questions based only on the recording.',
            listeningPlaysAllowed: request.assessment.listeningPlaysAllowed || 1,
            listeningAudioSpeed: request.assessment.listeningAudioSpeed || 1,
            listeningPrepTime: request.assessment.listeningPrepTime || 30,
            listeningDuration: request.assessment.listeningDuration,
            listeningTotalMarks: componentMarks,
            listeningPassingMarks: Math.round(componentMarks / 2),
            listeningTimeLimit: request.assessment.listeningTimeLimit || 10,
          }),
        },
      });

      await tx.assessmentQuestion.createMany({
        data: shuffledQuestions.map((q, index) => ({
          assessmentId: assessment.id,
          type: q.type,
          questionText: q.questionText,
          options: q.type === 'MCQ' ? [...(q.options || [])].sort(() => Math.random() - 0.5) : (q.options || []),
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          marks: q.isListening
            ? componentMarks / Math.max(1, listeningQuestionsCount)
            : componentMarks / Math.max(1, writtenQuestionsCount),
          order: index,
          isListening: Boolean(q.isListening),
        })),
      });

      await tx.assessmentSubmission.create({
        data: {
          assessmentId: assessment.id,
          applicationId: request.applicationId,
          status: 'IN_PROGRESS',
          attemptNumber: nextAttempt,
          assessmentVersion: assessment.assessmentVersion,
          previousSubmissionId: request.previousAttemptId,
        },
      });

      await tx.assessmentReassignmentRequest.update({
        where: { id: request.id },
        data: {
          status: 'APPROVED',
          approvedById,
          approvedAt: now,
          generatedAssessmentId: assessment.id,
          auditLogs: {
            create: { action: 'APPROVED_AND_REASSIGNED', performedById: approvedById, details: { attemptNumber: nextAttempt, questionCount, totalMarks } },
          },
        },
      });

      await tx.assessmentNotification.create({
        data: {
          assessmentId: assessment.id,
          userId: request.parentId,
          title: 'New Assessment Assigned',
          message: `Your new assessment has been assigned. You can now start Attempt ${nextAttempt}.`,
          type: 'REASSESSMENT_APPROVED',
        },
      });

      return assessment;
    });
  }

  async generateReassignmentPreview(
    requestId: string,
    dto: { questionCount?: number; difficulty?: string; writtenQuestionCount?: number; hasWritten?: boolean; hasListening?: boolean; hasReading?: boolean; hasSpeaking?: boolean; listeningActivityType?: string; listeningTranscript?: string },
    schoolId: string,
  ) {
    const request = await this.prisma.assessmentReassignmentRequest.findFirst({
      where: { id: requestId, schoolId, status: 'PENDING' },
      include: { assessment: { include: { questions: true } } },
    });
    if (!request) throw new NotFoundException('Pending re-assessment request not found.');

    const hasWritten = dto.hasWritten ?? request.assessment.hasWritten;
    const hasListening = dto.hasListening ?? request.assessment.hasListening;
    if (!hasWritten && !hasListening) return [];

    const questionCount = Math.max(1, dto.questionCount || request.assessment.questionCount);
    if (hasWritten && hasListening && questionCount < 2) {
      throw new BadRequestException(
        'Select at least 2 questions when both Written and Listening components are enabled.',
      );
    }
    const writtenAllocation = hasWritten ? (hasListening ? Math.ceil(questionCount / 2) : questionCount) : 0;
    const listeningAllocation = hasListening ? questionCount - writtenAllocation : 0;
    const requiredDetailed = Math.max(0, Math.min(writtenAllocation, Number(dto.writtenQuestionCount) || 0));
    const generatedWritten = writtenAllocation
      ? await this.generateQuestions({
          grade: request.assessment.grade,
          subject: request.assessment.subject,
          difficulty: dto.difficulty || request.assessment.difficulty,
          questionCount: writtenAllocation,
          writtenQuestionCount: requiredDetailed,
        }, schoolId)
      : [];
    const generatedListening = listeningAllocation
      ? (await this.generateListeningQuestions({
          grade: request.assessment.grade,
          subject: request.assessment.subject,
          difficulty: dto.difficulty || request.assessment.difficulty,
          activityType: dto.listeningActivityType || request.assessment.listeningActivityType || 'Listen and Answer Questions',
          transcript: dto.listeningTranscript || request.assessment.listeningTranscript || 'The Sun is at the center of the solar system. Eight planets orbit the Sun. Earth is the third planet and is known to support life.',
          questionCount: listeningAllocation,
        }, schoolId)).questions
      : [];
    const previousTexts = new Set(request.assessment.questions.map(q => q.questionText.trim().toLowerCase()));
    const freshWritten = generatedWritten
      .filter(q => q?.questionText && !previousTexts.has(q.questionText.trim().toLowerCase()))
      .map(q => ({ ...q, isListening: false }));
    if (freshWritten.length < writtenAllocation) {
      freshWritten.push(
        ...this.reassessmentFallbackQuestions(
          request.assessment.subject,
          request.assessment.grade,
          writtenAllocation - freshWritten.length,
        )
          .filter(q => !previousTexts.has(q.questionText.trim().toLowerCase()))
          .map(q => ({ ...q, isListening: false })),
      );
    }

    // Listening questions must never be replaced by generic written fallbacks.
    // If a local fallback repeats wording from the previous attempt, make the
    // new item explicitly versioned while preserving its listening component.
    const usedListeningTexts = new Set<string>();
    const freshListening = generatedListening.map((question, index) => {
      const baseText = String(question.questionText || `Listening question ${index + 1}`).trim();
      let questionText = baseText;
      let normalized = questionText.toLowerCase();
      if (previousTexts.has(normalized) || usedListeningTexts.has(normalized)) {
        questionText = `Re-assessment listening item ${index + 1}: ${baseText}`;
        normalized = questionText.toLowerCase();
      }
      usedListeningTexts.add(normalized);
      return { ...question, questionText, isListening: true };
    });

    let fresh = [...freshWritten.slice(0, writtenAllocation), ...freshListening.slice(0, listeningAllocation)];
    if (fresh.length < questionCount) throw new BadRequestException('Could not generate enough fresh questions. Please try again.');

    return fresh.slice(0, questionCount).sort(() => Math.random() - 0.5).map((question, index) => ({
      ...question,
      order: index,
      previewId: `preview-${Date.now()}-${index}`,
    }));
  }

  async rejectReassignment(requestId: string, reason: string, schoolId: string, rejectedById: string) {
    if (!reason?.trim()) throw new BadRequestException('A rejection reason is required.');
    const request = await this.prisma.assessmentReassignmentRequest.findFirst({ where: { id: requestId, schoolId } });
    if (!request) throw new NotFoundException('Re-assessment request not found.');
    if (request.status !== 'PENDING') throw new BadRequestException('This request has already been processed.');

    const updated = await this.prisma.assessmentReassignmentRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason.trim(),
        rejectedAt: new Date(),
        auditLogs: { create: { action: 'REJECTED', performedById: rejectedById, details: { reason: reason.trim() } } },
      },
    });
    await this.prisma.assessmentNotification.create({
      data: {
        assessmentId: request.assessmentId,
        userId: request.parentId,
        title: 'Re-Assessment Request Rejected',
        message: `Your re-assessment request has been rejected. Reason: ${reason.trim()}`,
        type: 'REASSESSMENT_REJECTED',
      },
    });
    return updated;
  }

  async aiGradeSubmission(id: string, schoolId: string) {
    const sub = await this.prisma.assessmentSubmission.findFirst({
      where: { id, assessment: { schoolId } },
      include: {
        assessment: {
          include: {
            questions: true,
          },
        },
        answers: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!sub) {
      throw new NotFoundException('Submission not found.');
    }

    const gradedAnswers = [];

    for (const ans of sub.answers) {
      if (ans.question.type === 'MCQ') {
        const isCorrect = ans.selectedOption === ans.question.correctAnswer;
        gradedAnswers.push({
          answerId: ans.id,
          questionId: ans.questionId,
          marksObtained: isCorrect ? ans.question.marks : 0,
          isCorrect,
          teacherRemarks: isCorrect ? 'Correct MCQ selection.' : `Incorrect MCQ selection. Expected: ${ans.question.correctAnswer}`,
        });
      } else {
        try {
          const prompt = `Evaluate this student written response.
          Question: "${ans.question.questionText}"
          Max Marks: ${ans.question.marks}
          Baseline Correct Answer: "${ans.question.correctAnswer || ''}"
          Student Response: "${ans.writtenAnswer || ''}"
          
          Determine:
          1. Is the response substantially correct? (true or false)
          2. Recommended marks (number from 0 to ${ans.question.marks})
          3. Short constructive feedback explanation (1 sentence)
          
          Format your response STRICTLY as raw JSON:
          {
            "isCorrect": boolean,
            "marksObtained": number,
            "teacherRemarks": "string"
          }
          Do NOT wrap in markdown code blocks.`;

          const aiResponse = await this.aiService.chat(prompt, schoolId);
          const cleanedJson = aiResponse.response.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanedJson);
          
          gradedAnswers.push({
            answerId: ans.id,
            questionId: ans.questionId,
            marksObtained: typeof parsed.marksObtained === 'number' ? parsed.marksObtained : 0,
            isCorrect: typeof parsed.isCorrect === 'boolean' ? parsed.isCorrect : false,
            teacherRemarks: parsed.teacherRemarks || 'Graded by AI Assistant.',
          });
        } catch (e: any) {
          console.error('AI grading failed for answer, using mock generator:', e.message);
          const isCorrect = ans.writtenAnswer && ans.writtenAnswer.trim().length > 10;
          gradedAnswers.push({
            answerId: ans.id,
            questionId: ans.questionId,
            marksObtained: isCorrect ? ans.question.marks : 0,
            isCorrect: !!isCorrect,
            teacherRemarks: isCorrect ? 'Detailed written response.' : 'Response is incomplete or empty.',
          });
        }
      }
    }

    // AI evaluation for Reading and Speaking if enabled but not yet evaluated
    let readingAiScore = sub.readingAudioUrl ? sub.readingAiScore : null;
    let readingEvaluation = sub.readingAudioUrl ? sub.readingEvaluation : null;
    if (sub.assessment.hasReading && sub.readingAudioUrl && (!readingAiScore || !readingEvaluation)) {
      try {
        const evalResult = await this.aiService.evaluateReading(sub.assessment.readingText || "", sub.readingAudioUrl, schoolId);
        readingEvaluation = evalResult;
        readingAiScore = evalResult.overallScore;
        await this.prisma.assessmentSubmission.update({
          where: { id: sub.id },
          data: { readingAiScore, readingEvaluation: readingEvaluation as any },
        });
      } catch (err) {
        console.error("AI Reading Evaluation failed in aiGradeSubmission:", err);
      }
    }

    let speakingAiScore = sub.speakingVideoUrl ? sub.speakingAiScore : null;
    let speakingEvaluation = sub.speakingVideoUrl ? sub.speakingEvaluation : null;
    if (sub.assessment.hasSpeaking && sub.speakingVideoUrl && (!speakingAiScore || !speakingEvaluation)) {
      try {
        const evalResult = await this.aiService.evaluateSpeaking(sub.assessment.speakingActivityType || "", sub.assessment.speakingPrompt || "", sub.speakingVideoUrl, schoolId);
        speakingEvaluation = evalResult;
        speakingAiScore = evalResult.overallScore;
        await this.prisma.assessmentSubmission.update({
          where: { id: sub.id },
          data: { speakingAiScore, speakingEvaluation: speakingEvaluation as any },
        });
      } catch (err) {
        console.error("AI Speaking Evaluation failed in aiGradeSubmission:", err);
      }
    }

    const listeningQuestions = sub.assessment.questions.filter(q => q.isListening);
    const listeningAnswers = sub.answers.filter(a => listeningQuestions.some(q => q.id === a.questionId));
    const hasListeningEvidence = Boolean(
      sub.assessment.listeningTranscript &&
      sub.listeningPlaysUsed > 0 &&
      listeningAnswers.length > 0
    );
    let listeningAiScore = hasListeningEvidence ? sub.listeningAiScore : null;
    let listeningEvaluation = hasListeningEvidence ? sub.listeningEvaluation : null;
    if (sub.assessment.hasListening && hasListeningEvidence && (!listeningAiScore || !listeningEvaluation)) {
      try {
        const evalResult = await this.aiService.evaluateListening(
          sub.assessment.listeningTranscript!,
          listeningQuestions,
          listeningAnswers,
          sub.listeningPlaysUsed,
          sub.listeningTimeTaken || 0,
          schoolId
        );
        listeningEvaluation = evalResult;
        listeningAiScore = evalResult.overallScore;
        await this.prisma.assessmentSubmission.update({
          where: { id: sub.id },
          data: { listeningAiScore, listeningEvaluation: listeningEvaluation as any },
        });
      } catch (err) {
        console.error("AI Listening Evaluation failed in aiGradeSubmission:", err);
      }
    }

    // Calculate total score and overall stats
    let totalScore = 0;
    if (sub.assessment.hasWritten) {
      const writtenAnswers = gradedAnswers.filter(a => {
        const matchingAns = sub.answers.find(ans => ans.id === a.answerId);
        return !matchingAns?.question?.isListening;
      });
      totalScore += writtenAnswers.reduce((acc, curr) => acc + curr.marksObtained, 0);
    }
    if (sub.assessment.hasReading && readingAiScore) {
      totalScore += (readingAiScore / 100) * (sub.assessment.readingTotalMarks || 0);
    }
    if (sub.assessment.hasSpeaking && speakingAiScore) {
      totalScore += (speakingAiScore / 100) * (sub.assessment.speakingTotalMarks || 0);
    }
    if (sub.assessment.hasListening && listeningAiScore) {
      totalScore += (listeningAiScore / 100) * (sub.assessment.listeningTotalMarks || 0);
    }

    const totalMarks = sub.assessment.totalMarks;
    const percentage = totalMarks > 0 ? (totalScore / totalMarks) * 100 : 0;
    
    // Status decision based on passingMarks threshold
    const passingMarks = sub.assessment.passingMarks;
    const status = totalScore >= passingMarks ? 'PASS' : 'FAIL';
    const formattedTotalScore = Number(totalScore.toFixed(1));
    const formattedTotalMarks = Number(totalMarks.toFixed(1));
    const formattedPercentage = Number(percentage.toFixed(1));

    // Tailored overall comments based on score percentage
    let remarks = '';
    try {
      const prompt = `Write a professional, constructive 1-2 sentence overall feedback summary for a student candidate who scored ${formattedTotalScore}/${formattedTotalMarks} (${formattedPercentage}%) on their "${sub.assessment.subject}" entrance assessment. Keep it encouraging but realistic. Return only the comment text.`;
      const aiResponse = await this.aiService.chat(prompt, schoolId);
      remarks = aiResponse.response.trim();
    } catch (err) {
      if (percentage >= 80) {
        remarks = `Excellent performance! The candidate scored ${formattedTotalScore}/${formattedTotalMarks} (${formattedPercentage}%), demonstrating outstanding conceptual clarity and answering questions with high precision.`;
      } else if (percentage >= 50) {
        remarks = `Good effort. The candidate scored ${formattedTotalScore}/${formattedTotalMarks} (${formattedPercentage}%), showing a solid understanding of core concepts, though there is room for improvement in some areas.`;
      } else {
        remarks = `The candidate scored ${formattedTotalScore}/${formattedTotalMarks} (${formattedPercentage}%), finding the assessment challenging. Needs significant improvement and further instruction in core topics.`;
      }
    }

    return {
      answers: gradedAnswers,
      overallScore: formattedTotalScore,
      percentage: formattedPercentage,
      status,
      remarks,
      readingAiScore,
      readingEvaluation,
      speakingAiScore,
      speakingEvaluation,
      listeningAiScore,
      listeningEvaluation,
    };
  }

  // Local helper question bank to support development gracefully without AI key
  private localMockQuestions(grade: string, subject: string, difficulty: string, count: number): any[] {
    if (subject === 'All') {
      const subjectsList = BACKEND_SUBJECTS_BY_GRADE[grade] || ["Mathematics", "English Literature", "EVS", "General Knowledge"];
      const results: any[] = [];
      for (let i = 0; i < count; i++) {
        const sub = subjectsList[i % subjectsList.length];
        const subQuestions = this.localMockQuestions(grade, sub, difficulty, 1);
        results.push(subQuestions[0]);
      }
      return results;
    }

    if (subject === 'Mathematics') {
      return this.generateMathematicsQuestions(grade, difficulty, count);
    }

    const questionPools: Record<string, any[]> = {
      'English Literature': [
        this.mockMcq('Which word is a noun?', ['quickly', 'beautiful', 'garden', 'under'], 'garden', 'Garden names a place and is a noun.'),
        this.mockMcq('Choose the correctly spelled word.', ['becaus', 'because', 'becose', 'beacause'], 'because', 'Because is the correct spelling.'),
        this.mockMcq('Which word means the opposite of “happy”?', ['joyful', 'sad', 'bright', 'kind'], 'sad', 'Sad is an antonym of happy.'),
        this.mockMcq('Complete the sentence: She ___ a book every night.', ['read', 'reads', 'reading', 'reader'], 'reads', 'Reads agrees with the singular subject she.'),
        this.mockMcq('Which sentence uses correct punctuation?', ['Where are you.', 'Where are you?', 'where are you?', 'Where are you!'], 'Where are you?', 'A direct question begins with a capital letter and ends with a question mark.'),
        this.mockWritten('Write three sentences describing your favourite character from a story.', 'The response should identify a character and describe them using complete sentences.', 'Assesses literary understanding and written expression.'),
      ],
      'Science & Technology': [
        this.mockMcq('Which part of a plant absorbs water from the soil?', ['Flower', 'Leaf', 'Root', 'Fruit'], 'Root', 'Roots absorb water and minerals from the soil.'),
        this.mockMcq('Which state of matter has a fixed shape?', ['Gas', 'Liquid', 'Solid', 'Vapour'], 'Solid', 'A solid keeps its own shape.'),
        this.mockMcq('Which organ helps us breathe?', ['Heart', 'Lungs', 'Stomach', 'Kidneys'], 'Lungs', 'The lungs take in oxygen and release carbon dioxide.'),
        this.mockMcq('What provides most of Earth’s light and heat?', ['Moon', 'Sun', 'Stars', 'Wind'], 'Sun', 'The Sun is Earth’s main source of light and heat.'),
        this.mockMcq('Which device is used to enter text into a computer?', ['Monitor', 'Keyboard', 'Speaker', 'Printer'], 'Keyboard', 'A keyboard is an input device used for typing.'),
      ],
      'Social Studies': [
        this.mockMcq('Who makes rules and laws for a country?', ['Government', 'Hospital', 'Market', 'Library'], 'Government', 'A government creates and enforces laws.'),
        this.mockMcq('Which direction is opposite to east?', ['North', 'South', 'West', 'Up'], 'West', 'West is opposite to east.'),
        this.mockMcq('What does a map key explain?', ['Weather', 'Map symbols', 'Time', 'Distance only'], 'Map symbols', 'A map key explains the symbols used on a map.'),
        this.mockMcq('Which is a public service?', ['Police station', 'Toy shop', 'Cinema', 'Restaurant'], 'Police station', 'Police protection is a public service.'),
        this.mockMcq('A person who belongs to a country is called a ___.', ['tourist', 'citizen', 'visitor', 'guest'], 'citizen', 'A citizen is a legal member of a country.'),
      ],
      EVS: [
        this.mockMcq('Which action saves water?', ['Leaving a tap open', 'Fixing a leaking tap', 'Washing one plate at a time', 'Playing with a hose'], 'Fixing a leaking tap', 'Fixing leaks prevents water from being wasted.'),
        this.mockMcq('Which bin is commonly used for recyclable waste?', ['Recycling bin', 'Food bowl', 'Flower pot', 'Water tank'], 'Recycling bin', 'Recyclable materials should be placed in a recycling bin.'),
        this.mockMcq('Why are trees important?', ['They create plastic', 'They provide oxygen', 'They waste water', 'They cause pollution'], 'They provide oxygen', 'Trees release oxygen and support living things.'),
        this.mockMcq('Which is a renewable source of energy?', ['Coal', 'Petrol', 'Solar energy', 'Diesel'], 'Solar energy', 'Sunlight is naturally replenished.'),
        this.mockMcq('Which habit helps keep our surroundings clean?', ['Littering', 'Using a dustbin', 'Burning plastic', 'Wasting paper'], 'Using a dustbin', 'Using a dustbin prevents litter.'),
      ],
      'General Knowledge': [
        this.mockMcq('Which planet is known as the Red Planet?', ['Venus', 'Mars', 'Jupiter', 'Saturn'], 'Mars', 'Mars appears red because of iron oxide on its surface.'),
        this.mockMcq('Which animal is known as the Ship of the Desert?', ['Horse', 'Lion', 'Camel', 'Elephant'], 'Camel', 'Camels are well adapted to desert travel.'),
        this.mockMcq('How many days are there in a leap year?', ['364', '365', '366', '367'], '366', 'A leap year has 366 days.'),
        this.mockMcq('Which is the largest ocean on Earth?', ['Indian Ocean', 'Atlantic Ocean', 'Pacific Ocean', 'Arctic Ocean'], 'Pacific Ocean', 'The Pacific Ocean is the largest ocean.'),
        this.mockMcq('What is the name of our galaxy?', ['Andromeda', 'Milky Way', 'Orion', 'Solar Galaxy'], 'Milky Way', 'Our Solar System is in the Milky Way galaxy.'),
      ],
    };

    const list = questionPools[subject] || questionPools['General Knowledge'];

    const results = [];
    for (let i = 0; i < count; i++) {
      results.push(list[i % list.length]);
    }
    return results;
  }

  private generateMathematicsQuestions(grade: string, difficulty: string, count: number): any[] {
    const gradeNumber = Number(grade.match(/\d+/)?.[0] || 0);
    const questions: any[] = [];
    const used = new Set<string>();
    const difficultyBoost = difficulty === 'HARD' ? 20 : difficulty === 'MEDIUM' ? 10 : 0;

    while (questions.length < count) {
      let question: any;

      if (gradeNumber === 0) {
        const value = this.randomInt(1, difficulty === 'HARD' ? 10 : 5);
        question = this.mockMcq(
          `How many objects are shown if a group has ${value} objects?`,
          this.numericOptions(value, 0, 10),
          String(value),
          `Counting the objects gives ${value}.`,
        );
      } else if (gradeNumber <= 2) {
        const a = this.randomInt(2, 20 + difficultyBoost);
        const b = this.randomInt(1, a);
        const addition = Math.random() >= 0.5;
        const answer = addition ? a + b : a - b;
        question = this.mockMcq(
          `What is ${a} ${addition ? '+' : '-'} ${b}?`,
          this.numericOptions(answer, 0, 80),
          String(answer),
          `${a} ${addition ? '+' : '-'} ${b} = ${answer}.`,
        );
      } else if (gradeNumber <= 5) {
        const a = this.randomInt(2, 12 + Math.floor(difficultyBoost / 2));
        const b = this.randomInt(2, 12);
        const multiplication = Math.random() >= 0.35;
        const answer = multiplication ? a * b : a;
        question = multiplication
          ? this.mockMcq(`What is ${a} × ${b}?`, this.numericOptions(answer, 0, 300), String(answer), `${a} × ${b} = ${answer}.`)
          : this.mockMcq(`What is ${a * b} ÷ ${b}?`, this.numericOptions(answer, 0, 50), String(answer), `${a * b} ÷ ${b} = ${answer}.`);
      } else if (gradeNumber <= 8) {
        const x = this.randomInt(2, 20 + difficultyBoost);
        const coefficient = this.randomInt(2, 9);
        const constant = this.randomInt(1, 20);
        const total = coefficient * x + constant;
        question = this.mockMcq(
          `Solve for x: ${coefficient}x + ${constant} = ${total}.`,
          this.numericOptions(x, 0, 60),
          String(x),
          `Subtract ${constant}, then divide by ${coefficient}, giving x = ${x}.`,
        );
      } else {
        const percentage = [5, 10, 15, 20, 25][this.randomInt(0, 4)];
        const base = this.randomInt(2, 20) * 20;
        const answer = (percentage * base) / 100;
        question = this.mockMcq(
          `What is ${percentage}% of ${base}?`,
          this.numericOptions(answer, 0, 500),
          String(answer),
          `${percentage}/100 × ${base} = ${answer}.`,
        );
      }

      if (!used.has(question.questionText)) {
        used.add(question.questionText);
        questions.push(question);
      }
    }

    return questions;
  }

  private reassessmentFallbackQuestions(subject: string, grade: string, count: number): any[] {
    const gradeNumber = Number(grade.match(/\d+/)?.[0] || 0);
    const mathematicsTopics = gradeNumber === 0
      ? ['how you counted a group of objects', 'how two simple shapes are different', 'how to arrange three numbers from smallest to largest', 'how a repeating colour pattern continues']
      : gradeNumber <= 2
        ? ['the steps used to solve a simple addition word problem', 'how addition and subtraction are related', 'how to compare two numbers', 'how equal groups help with counting']
        : gradeNumber <= 5
          ? ['the steps used to solve a two-step word problem', 'how multiplication can be represented using equal groups', 'how to check whether an answer is reasonable', 'how a fraction represents part of a whole']
          : ['the steps used to solve a multi-step equation', 'how to check whether a mathematical answer is reasonable', 'the difference between area and perimeter', 'how ratios or percentages can solve a real-life problem'];
    const topics: Record<string, string[]> = {
      Mathematics: mathematicsTopics,
      'English Literature': ['the main idea of a short story', 'how an adjective improves a sentence', 'the difference between a noun and a verb', 'the meaning of a new word using context clues', 'the qualities of a memorable story character', 'how a story setting affects events'],
      'Science & Technology': ['how plants make or obtain food', 'how force can change an object’s motion', 'the stages of the water cycle', 'the role of the human digestive system', 'the difference between conductors and insulators', 'how computers process input and output'],
      'Social Studies': ['why communities need rules', 'how maps help us locate places', 'the responsibilities of a citizen', 'how local government serves people', 'why historical sources are important', 'how people adapt to their environment'],
      EVS: ['two ways to conserve water', 'why waste should be separated', 'how air pollution affects living things', 'why biodiversity is important', 'how renewable energy protects the environment', 'ways to keep a neighbourhood clean'],
      'General Knowledge': ['an important world landmark and its location', 'one major scientific invention and its use', 'the purpose of the United Nations', 'an important national symbol', 'one significant sporting event', 'the difference between a planet and a star'],
    };
    const selected = topics[subject] || topics['General Knowledge'];
    const shuffled = [...selected].sort(() => Math.random() - 0.5);
    return Array.from({ length: count }, (_, index) => {
      const topic = shuffled[index % shuffled.length];
      return this.mockWritten(
        `Explain ${topic} and give one relevant example.`,
        `The response should accurately explain ${topic} and include a suitable example.`,
        `Assesses understanding of ${topic}.`,
      );
    });
  }

  private reassessmentFallbackMcqs(
    subject: string,
    grade: string,
    count: number,
    previousTexts: Set<string>,
  ): any[] {
    const candidates = this.localMockQuestions(grade, subject, 'MEDIUM', Math.max(count * 3, count))
      .filter(question => question.type === 'MCQ');
    const selected: any[] = [];
    const used = new Set(previousTexts);

    for (let index = 0; selected.length < count && index < candidates.length; index += 1) {
      const candidate = { ...candidates[index], options: [...(candidates[index].options || [])] };
      let questionText = candidate.questionText.trim();
      let normalized = questionText.toLowerCase();

      if (used.has(normalized)) {
        const naturalPrompts = [
          'Choose the correct answer: ',
          'Select the best answer: ',
          'Answer the following: ',
          'Solve this question: ',
        ];
        questionText = `${naturalPrompts[index % naturalPrompts.length]}${questionText}`;
        normalized = questionText.toLowerCase();
      }
      if (used.has(normalized)) continue;

      used.add(normalized);
      selected.push({ ...candidate, questionText });
    }

    return selected;
  }

  private numericOptions(answer: number, minimum: number, maximum: number): string[] {
    const values = new Set<number>([answer]);
    while (values.size < 4) {
      const offset = this.randomInt(1, Math.max(3, Math.ceil(Math.abs(answer) * 0.25)));
      const candidate = Math.max(minimum, Math.min(maximum, answer + (Math.random() >= 0.5 ? offset : -offset)));
      values.add(candidate);
    }
    return [...values].sort(() => Math.random() - 0.5).map(String);
  }

  private randomInt(minimum: number, maximum: number): number {
    return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
  }

  private mockMcq(questionText: string, options: string[], correctAnswer: string, explanation: string) {
    return { type: 'MCQ', questionText, options, correctAnswer, explanation, marks: 10 };
  }

  private mockWritten(questionText: string, correctAnswer: string, explanation: string) {
    return { type: 'WRITTEN', questionText, options: [], correctAnswer, explanation, marks: 10 };
  }

  async findStudentApplication(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Student user not found.');
    if (!user.schoolId) throw new BadRequestException('User has no school associated.');
    const application = await this.prisma.application.findFirst({
      where: {
        schoolId: user.schoolId,
        status: { not: 'DRAFT' },
        OR: [
          { studentEmail: user.email },
          { studentFirstName: user.firstName, studentLastName: user.lastName },
        ]
      }
    });
    if (!application) throw new NotFoundException('Student application profile not found.');
    return application;
  }

  async getStudentAssessmentDetail(id: string, userId: string) {
    const app = await this.findStudentApplication(userId);
    const assessment = await this.prisma.assessment.findFirst({
      where: { id, applicationId: app.id, OR: [{ assessmentMode: 'SCHOOL' }, { assessmentMode: 'BOTH', venueChoice: 'SCHOOL' }] },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
        submissions: {
          orderBy: { createdAt: 'desc' },
          include: {
            answers: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found.');
    }

    return {
      ...assessment,
      questions: assessment.questions.map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      })),
    };
  }

  async startStudentAssessment(id: string, userId: string) {
    const app = await this.findStudentApplication(userId);
    const assessment = await this.prisma.assessment.findFirst({
      where: { id, applicationId: app.id, OR: [{ assessmentMode: 'SCHOOL' }, { assessmentMode: 'BOTH', venueChoice: 'SCHOOL' }] },
      include: {
        submissions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found.');
    }

    let submission = assessment.submissions[0];

    // A published school assessment may be assigned before an attempt exists.
    // Create the first attempt when the verified student actually starts it.
    if (!submission) {
      submission = await this.prisma.assessmentSubmission.create({
        data: {
          assessmentId: assessment.id,
          applicationId: app.id,
          status: 'IN_PROGRESS',
          attemptNumber: 1,
          assessmentVersion: assessment.assessmentVersion,
          startedAt: new Date(),
        },
      });
    }

    if (submission.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Submission is already finalized.');
    }

    await this.prisma.assessmentSubmission.updateMany({
      where: {
        id: submission.id,
        status: 'IN_PROGRESS',
        startedAt: null,
      },
      data: {
        startedAt: new Date(),
      },
    });

    return this.getStudentAssessmentDetail(id, userId);
  }

  async saveStudentAnswers(id: string, dto: SubmitAssessmentDto, userId: string) {
    const app = await this.findStudentApplication(userId);
    const ass = await this.prisma.assessment.findFirst({
      where: { id, applicationId: app.id, OR: [{ assessmentMode: 'SCHOOL' }, { assessmentMode: 'BOTH', venueChoice: 'SCHOOL' }] },
      include: { submissions: true },
    });

    if (!ass || ass.submissions.length === 0) {
      throw new NotFoundException('Active submission context not found.');
    }

    const sub = ass.submissions[0];
    if (sub.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Submission is already finalized.');
    }

    // Upsert answers
    if (dto.answers) {
      for (const ans of dto.answers) {
        await this.prisma.assessmentAnswer.upsert({
          where: {
            submissionId_questionId: {
              submissionId: sub.id,
              questionId: ans.questionId,
            },
          },
          create: {
            submissionId: sub.id,
            questionId: ans.questionId,
            selectedOption: ans.selectedOption,
            writtenAnswer: ans.writtenAnswer,
            fileUrl: ans.fileUrl,
            fileName: ans.fileName,
          },
          update: {
            selectedOption: ans.selectedOption,
            writtenAnswer: ans.writtenAnswer,
            fileUrl: ans.fileUrl,
            fileName: ans.fileName,
          },
        });
      }
    }

    // Update audio/video/plays/warnings
    await this.prisma.assessmentSubmission.update({
      where: { id: sub.id },
      data: {
        ...(dto.readingAudioUrl !== undefined && { readingAudioUrl: dto.readingAudioUrl }),
        ...(dto.speakingVideoUrl !== undefined && { speakingVideoUrl: dto.speakingVideoUrl }),
        ...(dto.listeningPlaysUsed !== undefined && { listeningPlaysUsed: dto.listeningPlaysUsed }),
        ...(dto.listeningTimeTaken !== undefined && { listeningTimeTaken: dto.listeningTimeTaken }),
        ...(dto.totalWarnings !== undefined && { totalWarnings: dto.totalWarnings }),
        ...(dto.tabSwitchCount !== undefined && { tabSwitchCount: dto.tabSwitchCount }),
        ...(dto.fullscreenExitCount !== undefined && { fullscreenExitCount: dto.fullscreenExitCount }),
        ...(dto.submissionReason !== undefined && { submissionReason: dto.submissionReason }),
      },
    });

    return { success: true };
  }

  async submitStudentAssessment(id: string, dto: SubmitAssessmentDto, userId: string) {
    const app = await this.findStudentApplication(userId);
    const existing = await this.prisma.assessment.findFirst({
      where: { id, applicationId: app.id, OR: [{ assessmentMode: 'SCHOOL' }, { assessmentMode: 'BOTH', venueChoice: 'SCHOOL' }] },
      include: { submissions: true },
    });

    if (!existing || existing.submissions.length === 0) {
      throw new NotFoundException('Submission context not found.');
    }

    if (existing.submissions[0].status !== 'IN_PROGRESS') {
      return {
        success: true,
        alreadySubmitted: true,
        autoEvaluated: existing.submissions[0].status === 'EVALUATED',
      };
    }

    // 1. Save final answers
    await this.saveStudentAnswers(id, dto, userId);

    const ass = await this.prisma.assessment.findFirst({
      where: { id, applicationId: app.id, OR: [{ assessmentMode: 'SCHOOL' }, { assessmentMode: 'BOTH', venueChoice: 'SCHOOL' }] },
      include: {
        questions: true,
        submissions: {
          include: {
            answers: true,
          },
        },
        application: {
          include: {
            school: true,
          },
        },
      },
    });

    if (!ass || ass.submissions.length === 0) {
      throw new NotFoundException('Submission context not found.');
    }

    const sub = ass.submissions[0];

    // 2. Auto-grade MCQ
    let autoScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let hasSubjective = ass.hasReading || ass.hasSpeaking || ass.hasListening;

    for (const q of ass.questions) {
      const studentAns = sub.answers.find(a => a.questionId === q.id);
      if (!studentAns) {
        if (q.type !== 'MCQ') {
          hasSubjective = true;
        }
        continue;
      }
      
      if (q.type === 'MCQ') {
        const isCorrect = studentAns.selectedOption === q.correctAnswer;
        const marksObtained = isCorrect ? q.marks : 0;
        
        await this.prisma.assessmentAnswer.update({
          where: { id: studentAns.id },
          data: {
            isCorrect,
            marksObtained,
          },
        });

        autoScore += marksObtained;
        if (isCorrect) correctCount++;
        else wrongCount++;
      } else {
        hasSubjective = true;
      }
    }

    // 3. AI Evaluations
    let readingAiScore: number | null = null;
    let readingEvaluation: any = null;
    let speakingAiScore: number | null = null;
    let speakingEvaluation: any = null;
    let listeningAiScore: number | null = null;
    let listeningEvaluation: any = null;

    if (ass.hasReading) {
      const audioUrl = dto.readingAudioUrl || sub.readingAudioUrl;
      if (audioUrl) {
        try {
          const evalResult = await this.aiService.evaluateReading(ass.readingText || "", audioUrl, ass.schoolId);
          readingEvaluation = evalResult;
          readingAiScore = evalResult.overallScore;
        } catch (err) {
          console.error("AI Reading Evaluation failed:", err);
        }
      }
    }

    if (ass.hasSpeaking) {
      const videoUrl = dto.speakingVideoUrl || sub.speakingVideoUrl;
      if (videoUrl) {
        try {
          const evalResult = await this.aiService.evaluateSpeaking(ass.speakingActivityType || "", ass.speakingPrompt || "", videoUrl, ass.schoolId);
          speakingEvaluation = evalResult;
          speakingAiScore = evalResult.overallScore;
        } catch (err) {
          console.error("AI Speaking Evaluation failed:", err);
        }
      }
    }

    if (ass.hasListening) {
      const listeningQuestions = ass.questions.filter(q => q.isListening);
      const listeningAnswers = sub.answers.filter(a => listeningQuestions.some(q => q.id === a.questionId));
      const playsUsed = dto.listeningPlaysUsed ?? sub.listeningPlaysUsed;
      const listenTimeTaken = dto.listeningTimeTaken ?? sub.listeningTimeTaken ?? 0;
      if (ass.listeningTranscript && playsUsed > 0 && listeningAnswers.length > 0) {
        try {
        const evalResult = await this.aiService.evaluateListening(
          ass.listeningTranscript,
          listeningQuestions,
          listeningAnswers,
          playsUsed,
          listenTimeTaken,
          ass.schoolId
        );
        listeningEvaluation = evalResult;
        listeningAiScore = evalResult.overallScore;
        } catch (err) {
          console.error("AI Listening Evaluation failed:", err);
        }
      }
    }

    const submittedAt = new Date();
    const timeTaken = sub.startedAt
      ? Math.max(0, Math.round((submittedAt.getTime() - sub.startedAt.getTime()) / 1000))
      : 0;

    await this.prisma.assessmentSubmission.update({
      where: { id: sub.id },
      data: {
        status: hasSubjective ? 'SUBMITTED' : 'EVALUATED',
        submittedAt,
        timeTaken,
        submissionReason: dto.submissionReason || 'NORMAL',
        ...(ass.hasReading && {
          readingAudioUrl: dto.readingAudioUrl || sub.readingAudioUrl,
          readingAiScore,
          readingEvaluation: readingEvaluation || undefined,
        }),
        ...(ass.hasSpeaking && {
          speakingVideoUrl: dto.speakingVideoUrl || sub.speakingVideoUrl,
          speakingAiScore,
          speakingEvaluation: speakingEvaluation || undefined,
        }),
        ...(ass.hasListening && {
          listeningPlaysUsed: dto.listeningPlaysUsed || sub.listeningPlaysUsed,
          listeningTimeTaken: dto.listeningTimeTaken || sub.listeningTimeTaken,
          listeningAiScore,
          listeningEvaluation: listeningEvaluation || undefined,
        }),
      },
    });

    // Send Notification to Parent
    await this.prisma.assessmentNotification.create({
      data: {
        assessmentId: ass.id,
        userId: ass.application?.parentId || app.parentId,
        title: 'Assessment Submitted',
        message: `Your child ${ass.application?.studentFirstName} ${ass.application?.studentLastName} has successfully completed and submitted the assessment: "${ass.title}".`,
        type: 'SUBMITTED',
      },
    });

    if (!ass.applicationId) {
      throw new BadRequestException('Cannot submit template assessment.');
    }
    const applicationId = ass.applicationId;

    // 4. Instantly publish if objective
    if (!hasSubjective) {
      const percentage = ass.totalMarks > 0 ? (autoScore / ass.totalMarks) * 100 : 0;
      const status = percentage >= ass.passingMarks ? 'PASS' : 'FAIL';

      const resultData = {
        score: autoScore,
        percentage,
        correctCount,
        wrongCount,
        status,
        remarks: 'Auto-graded objective student assessment.',
        teacherComments: 'Satisfied baseline objective assessment criteria.',
        publishedAt: new Date(),
      };

      await this.prisma.assessmentResult.upsert({
        where: {
          assessmentId_applicationId: {
            assessmentId: ass.id,
            applicationId,
          },
        },
        create: {
          assessmentId: ass.id,
          applicationId,
          ...resultData,
        },
        update: resultData,
      });

      // Update application stage
      await this.prisma.application.update({
        where: { id: applicationId },
        data: { status: status === 'PASS' ? 'INTERVIEW_SCHEDULED' : 'ASSESSMENT' },
      });
    }

    // 5. Notify Admissions Staff
    const staffMembers = await this.prisma.user.findMany({
      where: {
        schoolId: ass.schoolId,
        role: { in: ['SCHOOL_ADMIN', 'ADMISSIONS_STAFF'] },
      },
    });

    for (const staff of staffMembers) {
      await this.prisma.notification.create({
        data: {
          userId: staff.id,
          title: 'Student Assessment Submitted',
          message: `Candidate ${ass.application?.studentFirstName} ${ass.application?.studentLastName} has completed the assessment: ${ass.title}.`,
          type: 'SYSTEM',
        },
      });
    }

    return { success: true };
  }

  async getSchedule(assessmentId: string, schoolId: string) {
    return this.prisma.assessmentSchedule.findFirst({
      where: { assessmentId, assessment: { schoolId } },
      include: { slots: true },
    });
  }

  async updateSlotCapacity(slotId: string, capacityValue: number, schoolId: string) {
    const capacity = Number(capacityValue);
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new BadRequestException('Maximum capacity must be a whole number greater than zero.');
    }

    const slot = await this.prisma.assessmentSlot.findFirst({
      where: { id: slotId, schedule: { assessment: { schoolId } } },
    });
    if (!slot) throw new NotFoundException('Assessment slot not found');

    const bookedCount = await this.prisma.studentSlotBooking.count({
      where: {
        slotId,
        bookingStatus: { in: ['BOOKED', 'RESCHEDULED', 'COMPLETED'] },
      },
    });
    if (capacity < bookedCount) {
      throw new BadRequestException(
        `Capacity cannot be less than the ${bookedCount} existing booking${bookedCount === 1 ? '' : 's'}.`,
      );
    }

    return this.prisma.assessmentSlot.update({
      where: { id: slotId },
      data: {
        capacity,
        bookedCount,
        status: bookedCount >= capacity ? 'FULL' : 'AVAILABLE',
      },
    });
  }

  async getAvailableSlots(assessmentId: string) {
    const studentAss = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });
    if (!studentAss) throw new NotFoundException('Assessment not found');

    const template = await this.prisma.assessment.findFirst({
      where: {
        schoolId: studentAss.schoolId,
        applicationId: null,
        title: studentAss.title,
        grade: studentAss.grade,
        subject: studentAss.subject,
      },
    });

    if (!template) {
      return { schedule: null, slots: [], currentBooking: null };
    }

    let schedule = await this.prisma.assessmentSchedule.findUnique({
      where: { assessmentId: template.id },
      include: {
        slots: {
          orderBy: { startTime: 'asc' },
        },
      },
    });

    // A BOTH-mode template may not have its own on-campus schedule. Once the
    // student selects SCHOOL, reuse a published school schedule for the same
    // grade so they can immediately choose from the school's active slots.
    if (!schedule && studentAss.venueChoice === 'SCHOOL') {
      schedule = await this.prisma.assessmentSchedule.findFirst({
        where: {
          assessment: {
            schoolId: studentAss.schoolId,
            applicationId: null,
            assessmentMode: { in: ['SCHOOL', 'BOTH'] },
            grade: studentAss.grade,
            status: { not: 'ARCHIVED' },
          },
        },
        include: {
          slots: {
            where: { status: 'AVAILABLE' },
            orderBy: { startTime: 'asc' },
          },
        },
        orderBy: { assessmentDate: 'asc' },
      });
    }

    if (schedule) {
      await Promise.all(
        schedule.slots.map(async (slot) => {
          const bookedCount = await this.prisma.studentSlotBooking.count({
            where: {
              slotId: slot.id,
              bookingStatus: { in: ['BOOKED', 'RESCHEDULED', 'COMPLETED'] },
            },
          });
          const status = bookedCount >= slot.capacity ? 'FULL' : 'AVAILABLE';
          slot.bookedCount = bookedCount;
          slot.status = status;
          await this.prisma.assessmentSlot.update({
            where: { id: slot.id },
            data: { bookedCount, status },
          });
        }),
      );
    }

    const booking = await this.prisma.studentSlotBooking.findFirst({
      where: {
        assessmentId: studentAss.id,
        studentId: studentAss.applicationId || '',
      },
      include: { slot: true },
    });

    const slotBookingDeadline = studentAss.dueDate
      ? new Date(studentAss.dueDate.getTime() - 4 * 24 * 60 * 60 * 1000)
      : null;

    return {
      schedule,
      slots: schedule ? schedule.slots : [],
      currentBooking: booking,
      slotBookingDeadline,
      slotChangesLocked: Boolean(
        slotBookingDeadline && new Date() > slotBookingDeadline,
      ),
    };
  }

  async bookSlot(assessmentId: string, slotId: string, studentId: string, parentId?: string) {
    const studentAss = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });
    if (!studentAss) throw new NotFoundException('Assessment not found');
    const slotBookingDeadline = studentAss.dueDate
      ? new Date(studentAss.dueDate.getTime() - 4 * 24 * 60 * 60 * 1000)
      : null;
    if (slotBookingDeadline && new Date() > slotBookingDeadline) {
      throw new BadRequestException(
        `Slot booking and changes closed on ${slotBookingDeadline.toLocaleDateString('en-IN')}. Contact the assessment coordinator for help.`,
      );
    }
    if (
      studentAss.assessmentMode === 'BOTH' &&
      studentAss.venueChoice !== 'SCHOOL'
    ) {
      throw new BadRequestException(
        'Select At School as the assessment venue before booking a slot.',
      );
    }

    const slot = await this.prisma.assessmentSlot.findUnique({
      where: { id: slotId },
      include: { schedule: true },
    });
    if (!slot) throw new NotFoundException('Slot not found');

    const existingBooking = await this.prisma.studentSlotBooking.findUnique({
      where: {
        assessmentId_studentId: { assessmentId, studentId },
      },
    });
    if (
      existingBooking &&
      existingBooking.slotId !== slotId &&
      !slot.schedule.allowStudentRescheduling
    ) {
      throw new BadRequestException(
        'The school has locked slot changes for this assessment. Contact the assessment coordinator for help.',
      );
    }

    const currentBooked = await this.prisma.studentSlotBooking.count({
      where: { slotId, bookingStatus: { in: ['BOOKED', 'RESCHEDULED', 'COMPLETED'] } },
    });
    if (currentBooked >= slot.capacity) {
      throw new BadRequestException('Slot is full');
    }

    const app = await this.prisma.application.findUnique({
      where: { id: studentId },
      select: { parentId: true },
    });
    const actualParentId = parentId || app?.parentId || null;

    const booking = await this.prisma.studentSlotBooking.upsert({
      where: {
        assessmentId_studentId: {
          assessmentId,
          studentId,
        },
      },
      update: {
        slotId,
        bookingStatus: 'BOOKED',
        bookedAt: new Date(),
      },
      create: {
        assessmentId,
        studentId,
        parentId: actualParentId,
        slotId,
        bookingStatus: 'BOOKED',
      },
    });

    const slots = await this.prisma.assessmentSlot.findMany({
      where: { assessmentScheduleId: slot.assessmentScheduleId },
    });
    for (const s of slots) {
      const count = await this.prisma.studentSlotBooking.count({
        where: { slotId: s.id, bookingStatus: { in: ['BOOKED', 'RESCHEDULED', 'COMPLETED'] } },
      });
      await this.prisma.assessmentSlot.update({
        where: { id: s.id },
        data: {
          bookedCount: count,
          status: count >= s.capacity ? 'FULL' : 'AVAILABLE',
        },
      });
    }

    if (actualParentId) {
      await this.prisma.assessmentNotification.create({
        data: {
          assessmentId,
          userId: actualParentId,
          title: 'Your assessment slot has been confirmed.',
          message: `The slot for "${studentAss.title}" has been confirmed for ${slot.startTime} - ${slot.endTime}.`,
          type: 'SLOT_BOOKED',
        },
      });
    }

    return booking;
  }

  async cancelBooking(bookingId: string) {
    const booking = await this.prisma.studentSlotBooking.findUnique({
      where: { id: bookingId },
      include: { slot: true, assessment: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    const slotBookingDeadline = booking.assessment.dueDate
      ? new Date(booking.assessment.dueDate.getTime() - 4 * 24 * 60 * 60 * 1000)
      : null;
    if (slotBookingDeadline && new Date() > slotBookingDeadline) {
      throw new BadRequestException(
        `Slot changes closed on ${slotBookingDeadline.toLocaleDateString('en-IN')}. Contact the assessment coordinator for help.`,
      );
    }

    const updated = await this.prisma.studentSlotBooking.update({
      where: { id: bookingId },
      data: { bookingStatus: 'CANCELLED' },
    });

    const count = await this.prisma.studentSlotBooking.count({
      where: { slotId: booking.slotId, bookingStatus: { in: ['BOOKED', 'RESCHEDULED', 'COMPLETED'] } },
    });
    await this.prisma.assessmentSlot.update({
      where: { id: booking.slotId },
      data: {
        bookedCount: count,
        status: count >= booking.slot.capacity ? 'FULL' : 'AVAILABLE',
      },
    });

    if (booking.parentId) {
      await this.prisma.assessmentNotification.create({
        data: {
          assessmentId: booking.assessmentId,
          userId: booking.parentId,
          title: 'Your assessment slot has been cancelled.',
          message: `The slot for "${booking.assessment.title}" has been cancelled.`,
          type: 'SLOT_CANCELLED',
        },
      });
    }

    return updated;
  }

  async rescheduleBooking(bookingId: string, newSlotId: string) {
    const booking = await this.prisma.studentSlotBooking.findUnique({
      where: { id: bookingId },
      include: { slot: true, assessment: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const newSlot = await this.prisma.assessmentSlot.findUnique({
      where: { id: newSlotId },
    });
    if (!newSlot) throw new NotFoundException('New slot not found');

    const updated = await this.prisma.studentSlotBooking.update({
      where: { id: bookingId },
      data: {
        slotId: newSlotId,
        bookingStatus: 'RESCHEDULED',
      },
    });

    for (const id of [booking.slotId, newSlotId]) {
      const slotObj = await this.prisma.assessmentSlot.findUnique({
        where: { id },
      });
      if (slotObj) {
        const count = await this.prisma.studentSlotBooking.count({
          where: { slotId: id, bookingStatus: { in: ['BOOKED', 'RESCHEDULED', 'COMPLETED'] } },
        });
        await this.prisma.assessmentSlot.update({
          where: { id },
          data: {
            bookedCount: count,
            status: count >= slotObj.capacity ? 'FULL' : 'AVAILABLE',
          },
        });
      }
    }

    if (booking.parentId) {
      await this.prisma.assessmentNotification.create({
        data: {
          assessmentId: booking.assessmentId,
          userId: booking.parentId,
          title: 'Your assessment slot has been changed.',
          message: `The slot for "${booking.assessment.title}" has been rescheduled to ${newSlot.startTime} - ${newSlot.endTime}.`,
          type: 'SLOT_RESCHEDULED',
        },
      });
    }

    return updated;
  }

  async markAttendance(bookingId: string, attendanceStatus: string, remarks?: string) {
    const booking = await this.prisma.studentSlotBooking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    let bookingStatus = booking.bookingStatus;
    if (attendanceStatus === 'COMPLETED') {
      bookingStatus = 'COMPLETED';
    } else if (attendanceStatus === 'ABSENT') {
      bookingStatus = 'ABSENT';
    }

    return this.prisma.studentSlotBooking.update({
      where: { id: bookingId },
      data: {
        attendanceStatus,
        bookingStatus,
        remarks: remarks || null,
      },
    });
  }

  async getSchoolBookings(schoolId: string, assessmentId?: string) {
    if (!assessmentId) {
      return [];
    }
    const template = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, schoolId },
    });
    if (!template) throw new NotFoundException('Template assessment not found');

    const bookings = await this.prisma.studentSlotBooking.findMany({
      where: {
        assessment: {
          schoolId,
          title: template.title,
          grade: template.grade,
          subject: template.subject,
          applicationId: { not: null },
        },
      },
      include: {
        assessment: true,
        slot: true,
        application: {
          include: {
            parent: true,
          },
        },
      },
      orderBy: { bookedAt: 'desc' },
    });

    return bookings;
  }
}
