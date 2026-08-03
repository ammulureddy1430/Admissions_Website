import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const title = 'AT-School Entrance Assessment';

async function main() {
  const student = await prisma.application.findFirst({
    where: {
      OR: [
        { admissionNumber: 'GHC-2026-005' },
        { studentEmail: 'ananya@school.demo' },
      ],
    },
  });

  if (!student) {
    throw new Error('Ananya Sharma was not found. Run the main demo seed first.');
  }

  const templateData = {
    schoolId: student.schoolId,
    title,
    description: 'On-campus entrance assessment for Grade 2 applicants.',
    instructions: 'Report to the assigned room 15 minutes before the booked slot.',
    grade: 'Grade 2',
    subject: 'General Aptitude',
    difficulty: 'MEDIUM',
    questionCount: 2,
    timeLimit: 45,
    totalMarks: 20,
    passingMarks: 10,
    allowCalculator: false,
    shuffleQuestions: false,
    shuffleOptions: false,
    showResultImmediately: false,
    allowRetake: false,
    status: 'PUBLISHED',
    assessmentMode: 'SCHOOL',
    proctoringEnabled: true,
  };

  let template = await prisma.assessment.findFirst({
    where: { schoolId: student.schoolId, applicationId: null, title },
  });
  template = template
    ? await prisma.assessment.update({ where: { id: template.id }, data: templateData })
    : await prisma.assessment.create({ data: templateData });

  let assignment = await prisma.assessment.findFirst({
    where: { schoolId: student.schoolId, applicationId: student.id, title },
  });
  assignment = assignment
    ? await prisma.assessment.update({
        where: { id: assignment.id },
        data: { ...templateData, applicationId: student.id, dueDate: new Date('2026-08-09T11:00:00.000Z') },
      })
    : await prisma.assessment.create({
        data: { ...templateData, applicationId: student.id, dueDate: new Date('2026-08-09T11:00:00.000Z') },
      });

  await prisma.assessmentQuestion.deleteMany({
    where: { assessmentId: { in: [template.id, assignment.id] } },
  });
  await prisma.assessmentQuestion.createMany({
    data: [template.id, assignment.id].flatMap((assessmentId) => [
      {
        assessmentId,
        type: 'MCQ',
        questionText: 'Which number completes the pattern: 2, 4, 6, __?',
        options: ['7', '8', '9', '10'],
        correctAnswer: '8',
        explanation: 'The pattern increases by two.',
        marks: 10,
        order: 0,
      },
      {
        assessmentId,
        type: 'MCQ',
        questionText: 'Which word is the opposite of hot?',
        options: ['Warm', 'Cold', 'Bright', 'Fast'],
        correctAnswer: 'Cold',
        explanation: 'Cold is the opposite of hot.',
        marks: 10,
        order: 1,
      },
    ]),
  });

  const schedule = await prisma.assessmentSchedule.upsert({
    where: { assessmentId: template.id },
    update: {
      assessmentDate: new Date('2026-08-09T00:00:00.000Z'),
      campus: 'Main Campus', building: 'Academic Block', floor: 'Ground Floor',
      roomNumber: 'G-12', venue: 'Global Horizons School, Main Campus',
      instructions: 'Bring the admission acknowledgement and arrive 15 minutes early.',
      contactPerson: 'Admissions Desk', contactPhone: '+919999999900',
      contactEmail: 'admissions@horizons.demo', documentsRequired: ['Admission acknowledgement'],
    },
    create: {
      assessmentId: template.id, assessmentDate: new Date('2026-08-09T00:00:00.000Z'),
      campus: 'Main Campus', building: 'Academic Block', floor: 'Ground Floor',
      roomNumber: 'G-12', venue: 'Global Horizons School, Main Campus',
      instructions: 'Bring the admission acknowledgement and arrive 15 minutes early.',
      contactPerson: 'Admissions Desk', contactPhone: '+919999999900',
      contactEmail: 'admissions@horizons.demo', documentsRequired: ['Admission acknowledgement'],
    },
  });

  let slot = await prisma.assessmentSlot.findFirst({
    where: { assessmentScheduleId: schedule.id, slotName: 'Morning Slot' },
  });
  slot = slot
    ? await prisma.assessmentSlot.update({
        where: { id: slot.id },
        data: { startTime: '10:00 AM', endTime: '10:45 AM', capacity: 20, bookedCount: 1 },
      })
    : await prisma.assessmentSlot.create({
        data: { assessmentScheduleId: schedule.id, slotName: 'Morning Slot', startTime: '10:00 AM', endTime: '10:45 AM', capacity: 20, bookedCount: 1 },
      });

  await prisma.studentSlotBooking.upsert({
    where: { assessmentId_studentId: { assessmentId: assignment.id, studentId: student.id } },
    update: { slotId: slot.id, bookingStatus: 'BOOKED' },
    create: { assessmentId: assignment.id, studentId: student.id, parentId: student.parentId, slotId: slot.id, bookingStatus: 'BOOKED' },
  });

  const existingSubmission = await prisma.assessmentSubmission.findFirst({
    where: { assessmentId: assignment.id, applicationId: student.id },
  });
  if (!existingSubmission) {
    await prisma.assessmentSubmission.create({
      data: { assessmentId: assignment.id, applicationId: student.id, status: 'IN_PROGRESS' },
    });
  }

  await prisma.application.update({
    where: { id: student.id },
    data: { status: 'ASSESSMENT', assessmentAccessEnabled: true, accessCode: student.accessCode || 'ANANYA123' },
  });

  console.log(`Created/updated ${title} and assigned it to Ananya Sharma.`);
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
