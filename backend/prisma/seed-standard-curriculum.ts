import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const BOARDS = [
  { name: 'Central Board of Secondary Education (CBSE)', code: 'CBSE' },
  { name: 'Council for the Indian School Certificate Examinations (ICSE/ISC)', code: 'ICSE' },
  { name: 'State Board', code: 'STATE' },
  { name: 'International Baccalaureate (IB)', code: 'IB' },
  { name: 'Cambridge International (CAIE)', code: 'CAMBRIDGE' },
];

const GRADES = [
  'Nursery', 'LKG', 'UKG',
  ...Array.from({ length: 10 }, (_, index) => `Grade ${index + 1}`),
];

const EARLY_YEARS = [
  'Mathematics', 'English Literature', 'EVS', 'General Knowledge',
];
const PRIMARY_1_2 = [
  'Mathematics', 'English Literature', 'EVS', 'General Knowledge',
];
const PRIMARY_3_5 = [
  'Mathematics', 'English Literature', 'Science & Technology', 'Social Studies',
  'EVS', 'General Knowledge',
];
const MIDDLE_6_8 = [
  'Mathematics', 'English Literature', 'Science & Technology', 'Social Studies',
  'General Knowledge',
];
const SECONDARY_9_10 = [
  'Mathematics', 'English Literature', 'Science & Technology', 'Social Studies',
  'General Knowledge',
];
function subjectsForGrade(grade: string) {
  if (['Nursery', 'LKG', 'UKG'].includes(grade)) return EARLY_YEARS;
  const gradeNumber = Number(grade.replace('Grade ', ''));
  if (gradeNumber <= 2) return PRIMARY_1_2;
  if (gradeNumber <= 5) return PRIMARY_3_5;
  if (gradeNumber <= 8) return MIDDLE_6_8;
  if (gradeNumber <= 10) return SECONDARY_9_10;
  return SECONDARY_9_10;
}

function subjectCode(name: string) {
  return name
    .replace(/\s*\/\s*/g, '_')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase()
    .slice(0, 32);
}

async function seedSchool(schoolId: string, schoolName: string) {
  await prisma.curriculumGrade.deleteMany({
    where: {
      schoolId,
      name: { in: ['Grade 11', 'Grade 12'] },
      board: { code: { in: BOARDS.map((board) => board.code) } },
    },
  });

  const yearName = '2026-2027';
  const year = await prisma.academicYear.upsert({
    where: { schoolId_name: { schoolId, name: yearName } },
    update: { boardId: null, status: 'ACTIVE', isCurrent: true },
    create: {
      schoolId,
      name: yearName,
      startDate: new Date('2026-04-01T00:00:00.000Z'),
      endDate: new Date('2027-03-31T00:00:00.000Z'),
      isCurrent: true,
      status: 'ACTIVE',
    },
  });

  let gradeCount = 0;
  let subjectCount = 0;

  for (const boardDefinition of BOARDS) {
    const board = await prisma.curriculumBoard.upsert({
      where: { schoolId_code: { schoolId, code: boardDefinition.code } },
      update: { name: boardDefinition.name, status: 'ACTIVE' },
      create: {
        schoolId,
        ...boardDefinition,
        description: `Standard ${boardDefinition.name} curriculum`,
        status: 'ACTIVE',
      },
    });

    for (const [sortOrder, gradeName] of GRADES.entries()) {
      const grade = await prisma.curriculumGrade.upsert({
        where: {
          schoolId_boardId_academicYearId_name: {
            schoolId,
            boardId: board.id,
            academicYearId: year.id,
            name: gradeName,
          },
        },
        update: { sortOrder, status: 'ACTIVE' },
        create: {
          schoolId,
          boardId: board.id,
          academicYearId: year.id,
          name: gradeName,
          sortOrder,
          status: 'ACTIVE',
        },
      });
      gradeCount += 1;

      const allowedSubjects = subjectsForGrade(gradeName);
      await prisma.curriculumSubject.deleteMany({
        where: {
          schoolId,
          gradeId: grade.id,
          isCustom: false,
          name: { notIn: allowedSubjects },
        },
      });

      for (const subjectName of allowedSubjects) {
        await prisma.curriculumSubject.upsert({
          where: {
            schoolId_gradeId_name: {
              schoolId,
              gradeId: grade.id,
              name: subjectName,
            },
          },
          update: { status: 'ACTIVE' },
          create: {
            schoolId,
            gradeId: grade.id,
            name: subjectName,
            code: subjectCode(subjectName),
            description: `${subjectName} for ${gradeName}`,
            status: 'ACTIVE',
          },
        });
        subjectCount += 1;
      }
    }
  }

  console.log(`${schoolName}: ${BOARDS.length} boards, ${gradeCount} grades, ${subjectCount} subjects`);
}

async function main() {
  const schools = await prisma.school.findMany({ select: { id: true, name: true } });
  for (const school of schools) await seedSchool(school.id, school.name);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
