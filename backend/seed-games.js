const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { randomUUID } = require('crypto');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const questionsData = [
  {
    text: "What is 10 + 5?",
    options: [
      { key: "A", text: "12", isCorrect: false },
      { key: "B", text: "14", isCorrect: false },
      { key: "C", text: "15", isCorrect: true },
      { key: "D", text: "16", isCorrect: false }
    ],
    correct: "15",
    type: "MCQ",
    engineKey: "TREASURE_HUNT",
    categoryName: "Treasure Hunt",
    templateName: "Treasure Hunt Adventure",
    templateCode: "GT-TREASURE"
  },
  {
    text: "Select the even number.",
    options: [
      { key: "A", text: "3", isCorrect: false },
      { key: "B", text: "5", isCorrect: false },
      { key: "C", text: "7", isCorrect: false },
      { key: "D", text: "8", isCorrect: true }
    ],
    correct: "8",
    type: "MCQ",
    engineKey: "MAZE",
    categoryName: "Maze Games",
    templateName: "Maze Dash",
    templateCode: "GT-MAZE"
  },
  {
    text: "What is 5 - 2?",
    options: [
      { key: "A", text: "2", isCorrect: false },
      { key: "B", text: "3", isCorrect: true },
      { key: "C", text: "4", isCorrect: false },
      { key: "D", text: "5", isCorrect: false }
    ],
    correct: "3",
    type: "MCQ",
    engineKey: "RACING_GAME",
    categoryName: "Racing Games",
    templateName: "Math Racer",
    templateCode: "GT-RACING"
  },
  {
    text: "Select the shape with three corners.",
    options: [
      { key: "A", text: "Circle", isCorrect: false },
      { key: "B", text: "Square", isCorrect: false },
      { key: "C", text: "Triangle", isCorrect: true },
      { key: "D", text: "Rectangle", isCorrect: false }
    ],
    correct: "Triangle",
    type: "MCQ",
    engineKey: "LOGIC_GAME",
    categoryName: "Logical Thinking Games",
    templateName: "Logic Matrix",
    templateCode: "GT-LOGIC"
  },
  {
    text: "What is 2 x 4?",
    options: [
      { key: "A", text: "6", isCorrect: false },
      { key: "B", text: "8", isCorrect: true },
      { key: "C", text: "10", isCorrect: false },
      { key: "D", text: "12", isCorrect: false }
    ],
    correct: "8",
    type: "MCQ",
    engineKey: "MEMORY_MATCH",
    categoryName: "Memory Games",
    templateName: "Memory Match Master",
    templateCode: "GT-MEMORY"
  },
  {
    text: "What is 3 + 4?",
    options: [
      { key: "A", text: "5", isCorrect: false },
      { key: "B", text: "6", isCorrect: false },
      { key: "C", text: "7", isCorrect: true },
      { key: "D", text: "8", isCorrect: false }
    ],
    correct: "7",
    type: "MCQ",
    engineKey: "ADVENTURE_GAME",
    categoryName: "Adventure Games",
    templateName: "Adventure Dash",
    templateCode: "GT-ADVENTURE"
  },
  {
    text: "Which number comes after 19?",
    options: [
      { key: "A", text: "17", isCorrect: false },
      { key: "B", text: "18", isCorrect: false },
      { key: "C", text: "20", isCorrect: true },
      { key: "D", text: "21", isCorrect: false }
    ],
    correct: "20",
    type: "MCQ",
    engineKey: "BOARD_GAME",
    categoryName: "Board Games",
    templateName: "Board Game Arena",
    templateCode: "GT-BOARD"
  },
  {
    text: "What is 8 - 4?",
    options: [
      { key: "A", text: "2", isCorrect: false },
      { key: "B", text: "3", isCorrect: false },
      { key: "C", text: "4", isCorrect: true },
      { key: "D", text: "5", isCorrect: false }
    ],
    correct: "4",
    type: "MCQ",
    engineKey: "BUILDING_GAME",
    categoryName: "Building Games",
    templateName: "Building Blocks",
    templateCode: "GT-BUILDING"
  },
  {
    text: "Select the largest number.",
    options: [
      { key: "A", text: "12", isCorrect: false },
      { key: "B", text: "15", isCorrect: false },
      { key: "C", text: "9", isCorrect: false },
      { key: "D", text: "18", isCorrect: true }
    ],
    correct: "18",
    type: "MCQ",
    engineKey: "DRAG_DROP",
    categoryName: "Drag and Drop",
    templateName: "Drag and Drop Target",
    templateCode: "GT-DRAGDROP"
  },
  {
    text: "What is 10 - 3?",
    options: [
      { key: "A", text: "5", isCorrect: false },
      { key: "B", text: "6", isCorrect: false },
      { key: "C", text: "7", isCorrect: true },
      { key: "D", text: "8", isCorrect: false }
    ],
    correct: "7",
    type: "MCQ",
    engineKey: "FISHING_GAME",
    categoryName: "Fishing Games",
    templateName: "Fishing Master",
    templateCode: "GT-FISHING"
  },
  {
    text: "What is 5 + 5?",
    options: [
      { key: "A", text: "8", isCorrect: false },
      { key: "B", text: "9", isCorrect: false },
      { key: "C", text: "10", isCorrect: true },
      { key: "D", text: "11", isCorrect: false }
    ],
    correct: "10",
    type: "MCQ",
    engineKey: "BALLOON_POP",
    categoryName: "Balloon Pop",
    templateName: "Balloon Popper",
    templateCode: "GT-BALLOON"
  },
  {
    text: "Which is an odd number?",
    options: [
      { key: "A", text: "2", isCorrect: false },
      { key: "B", text: "4", isCorrect: false },
      { key: "C", text: "5", isCorrect: true },
      { key: "D", text: "6", isCorrect: false }
    ],
    correct: "5",
    type: "MCQ",
    engineKey: "SORTING_GAME",
    categoryName: "Sorting Games",
    templateName: "Sorting Machine",
    templateCode: "GT-SORTING"
  }
];

async function main() {
  console.log('Starting seed-games script...');

  // 1. Find school
  const school = await prisma.school.findFirst({
    where: { subdomain: 'demo' }
  });
  if (!school) {
    throw new Error('School not found.');
  }
  const schoolId = school.id;
  console.log(`Using school: ${school.name}`);

  // 2. Find curriculum hierarchy
  const board = await prisma.curriculumBoard.findFirst({ where: { schoolId } });
  const year = await prisma.academicYear.findFirst({ where: { schoolId } });
  const grade = await prisma.curriculumGrade.findFirst({ where: { schoolId, name: 'Grade 1' } });
  const subject = await prisma.curriculumSubject.findFirst({ where: { schoolId, name: 'Mathematics' } });

  if (!board || !year || !grade || !subject) {
    throw new Error('Curriculum hierarchy (CBSE board/year/Grade 1/Mathematics) not found.');
  }
  console.log('Found board, year, grade, and subject.');

  // 3. Find admissions admin user
  const adminUser = await prisma.user.findFirst({
    where: { schoolId, role: 'SCHOOL_ADMIN' }
  });
  if (!adminUser) {
    throw new Error('School admin user not found.');
  }
  const userId = adminUser.id;

  // 4. Create language, publisher, author
  const language = await prisma.language.upsert({
    where: { schoolId_code: { schoolId, code: 'en' } },
    update: {},
    create: { schoolId, code: 'en', name: 'English' }
  });

  const publisher = await prisma.publisher.upsert({
    where: { schoolId_name: { schoolId, name: 'NCERT' } },
    update: {},
    create: { schoolId, name: 'NCERT' }
  });

  const author = await prisma.author.upsert({
    where: { schoolId_name: { schoolId, name: 'R.D. Sharma' } },
    update: {},
    create: { schoolId, name: 'R.D. Sharma' }
  });

  // 5. Create Textbook & ProcessedTextbook
  let textbook = await prisma.textbook.findFirst({
    where: { schoolId, title: 'Mathematics Grade 1' }
  });

  if (!textbook) {
    textbook = await prisma.textbook.create({
      data: {
        textbookId: `TB-${randomUUID().slice(0, 8).toUpperCase()}`,
        schoolId,
        boardId: board.id,
        academicYearId: year.id,
        gradeId: grade.id,
        subjectId: subject.id,
        title: 'Mathematics Grade 1',
        edition: '2026',
        languageId: language.id,
        publisherId: publisher.id,
        authorId: author.id,
        status: 'ACTIVE',
        createdById: userId
      }
    });
    console.log(`Created Textbook: ${textbook.id}`);
  }

  let version = await prisma.textbookVersion.findFirst({
    where: { textbookId: textbook.id }
  });
  if (!version) {
    version = await prisma.textbookVersion.create({
      data: {
        textbookId: textbook.id,
        versionNumber: '1',
        isActive: true,
        createdById: userId
      }
    });
    console.log(`Created TextbookVersion: ${version.id}`);
  }

  let processedTextbook = await prisma.processedTextbook.findFirst({
    where: { schoolId, textbookVersionId: version.id }
  });
  if (!processedTextbook) {
    processedTextbook = await prisma.processedTextbook.create({
      data: {
        schoolId,
        textbookVersionId: version.id,
        boardId: board.id,
        academicYearId: year.id,
        gradeId: grade.id,
        subjectId: subject.id,
        status: 'COMPLETED',
        createdById: userId
      }
    });
    console.log(`Created ProcessedTextbook: ${processedTextbook.id}`);
  }

  // CLEAN UP PREVIOUS SEEDED DATA (for clean recovery)
  console.log('Cleaning up existing game assessment data...');
  await prisma.gameResult.deleteMany({});
  await prisma.gameAssignment.deleteMany({});
  await prisma.generatedGame.deleteMany({});
  await prisma.questionGameMapping.deleteMany({});
  await prisma.gameConfiguration.deleteMany({});
  await prisma.gameAIQuestion.deleteMany({});
  await prisma.gameAssessment.deleteMany({});
  console.log('Cleanup completed successfully.');

  // 6. Create Game Categories & Templates, Questions & Mappings
  const categoryMap = {};
  const categories = await prisma.gameCategory.findMany({ where: { schoolId } });
  for (const cat of categories) {
    categoryMap[cat.name] = cat.id;
  }

  const generatedGamesList = [];

  for (const qData of questionsData) {
    const categoryId = categoryMap[qData.categoryName];
    if (!categoryId) {
      console.log(`Category not found: ${qData.categoryName}`);
      continue;
    }

    // A. Create GameTemplate
    let template = await prisma.gameTemplate.findUnique({
      where: {
        schoolId_templateId: {
          schoolId,
          templateId: qData.templateCode
        }
      }
    });

    if (!template) {
      template = await prisma.gameTemplate.create({
        data: {
          templateId: qData.templateCode,
          schoolId,
          name: qData.templateName,
          description: `A standard ${qData.categoryName} template for ${grade.name} assessments.`,
          categoryId,
          difficulty: 'MEDIUM',
          estimatedDuration: 15,
          minimumQuestions: 1,
          maximumQuestions: 10,
          supportedDevices: ['Desktop', 'Tablet', 'Mobile'],
          status: 'ACTIVE',
          createdById: userId
        }
      });
      console.log(`Created GameTemplate: ${template.name} (${template.id})`);
    }

    // B. Create GameAIQuestion
    const aiQuestion = await prisma.gameAIQuestion.create({
      data: {
        schoolId,
        processedTextbookId: processedTextbook.id,
        textbookVersionId: version.id,
        pageNumber: 10,
        questionText: qData.text,
        correctAnswer: qData.correct,
        explanation: 'Seeded question explanation.',
        difficulty: 'MEDIUM',
        questionType: qData.type,
        bloomLevel: 'UNDERSTAND',
        status: 'APPROVED',
        generationBatchId: `BATCH-${randomUUID().slice(0, 8).toUpperCase()}`,
        createdById: userId,
        options: {
          create: qData.options.map((opt, idx) => ({
            optionKey: opt.key,
            optionText: opt.text,
            isCorrect: opt.isCorrect,
            sequence: idx
          }))
        }
      },
      include: { options: true }
    });
    console.log(`Created GameAIQuestion: ${aiQuestion.id}`);

    // C. Create QuestionGameMapping & GameConfiguration
    const mapping = await prisma.questionGameMapping.create({
      data: {
        schoolId,
        questionId: aiQuestion.id,
        selectedTemplateId: template.id,
        recommendedTemplateId: template.id,
        recommendationReason: 'Auto-recommended based on question type.',
        recommendationKey: qData.engineKey.toLowerCase(),
        acceptedRecommendation: true,
        mappedById: userId,
        configuration: {
          create: {
            difficulty: 'MEDIUM',
            timerSeconds: 30,
            lives: 3,
            scoringRules: { correct: 10, incorrect: 0, timeBonus: 2, completionBonus: 5 },
            hintRules: { allowHints: true, maxHints: 1, hintPenalty: 2 },
            animationConfiguration: { transitions: true, effects: 'glow' },
            soundConfiguration: { sfx: true, volume: 80 },
            accessibilitySettings: { textToSpeech: false }
          }
        }
      },
      include: { configuration: true }
    });
    console.log(`Created mapping: ${mapping.id}`);

    // D. Add to list for GeneratedGame creation
    generatedGamesList.push({
      template,
      engineKey: qData.engineKey,
      question: aiQuestion,
      mapping
    });
  }

  // 7. Create GameAssessment
  const gameAssessment = await prisma.gameAssessment.create({
    data: {
      schoolId,
      name: 'Evaluation Game Assessment',
      description: 'Entrance game assessment covering basic math and logic skills.',
      status: 'PUBLISHED',
      timeLimit: 30,
      settings: { shuffle: false, timer: true, sound: true, music: false },
      createdById: userId,
      assessmentType: 'Practice',
      assessmentMode: 'HOME',
      subject: 'Mathematics',
      grade: 'Grade 1',
      difficulty: 'MEDIUM',
      language: 'English',
      numberOfQuestions: questionsData.length,
      numberOfGames: questionsData.length,
      attemptLimit: 3,
      passingMarks: 50
    }
  });
  console.log(`Created GameAssessment: ${gameAssessment.id}`);

  // 8. Create GeneratedGame records
  const generatedGames = [];
  for (const item of generatedGamesList) {
    const qSnapshot = [{
      id: item.question.id,
      questionText: item.question.questionText,
      questionType: item.question.questionType,
      correctAnswer: item.question.correctAnswer,
      explanation: item.question.explanation,
      difficulty: item.question.difficulty,
      bloomLevel: item.question.bloomLevel,
      options: item.question.options.map((opt) => ({
        optionKey: opt.optionKey,
        optionText: opt.optionText,
        isCorrect: opt.isCorrect
      })),
      pageNumber: item.question.pageNumber
    }];

    const generatedGame = await prisma.generatedGame.create({
      data: {
        schoolId,
        gameAssessmentId: gameAssessment.id,
        templateId: item.template.id,
        engineKey: item.engineKey,
        title: `${item.template.name} Challenger`,
        description: `Play and solve: ${item.template.description}`,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        questionSnapshot: qSnapshot,
        configuration: {
          scoringRules: { correct: 10, incorrect: 0, timeBonus: 2, completionBonus: 5 },
          timerSeconds: 30,
          lives: 3
        },
        mappingIds: [item.mapping.id],
        questionIds: [item.question.id],
        createdById: userId
      }
    });
    console.log(`Created GeneratedGame: ${generatedGame.title} (${generatedGame.id})`);
    generatedGames.push(generatedGame);
  }

  // 9. Assign games to all applications
  const applications = await prisma.application.findMany({
    where: { schoolId, status: { not: 'DRAFT' } }
  });
  console.log(`Found ${applications.length} applications to assign games to.`);

  for (const app of applications) {
    for (const game of generatedGames) {
      // Create GameAssignment
      const assignment = await prisma.gameAssignment.create({
        data: {
          gameAssessmentId: gameAssessment.id,
          generatedGameId: game.id,
          assignedById: userId,
          targetType: 'STUDENT',
          targetIds: [app.id],
          status: 'ASSIGNED',
          maxAttempts: 3,
          timeLimitMinutes: 10,
          passingScore: 50,
          allowRestart: true,
          assignmentSettings: {}
        }
      });

      // Create GameResult
      await prisma.gameResult.create({
        data: {
          gameAssignmentId: assignment.id,
          studentId: app.id,
          status: 'NOT_STARTED'
        }
      });
    }
  }

  console.log(`Assigned games to ${applications.length} students successfully!`);
}

main()
  .catch(console.error)
  .finally(() => pool.end());
