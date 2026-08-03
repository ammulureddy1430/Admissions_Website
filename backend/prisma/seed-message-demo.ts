import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const candidates = [
  { firstName: 'Aarav', lastName: 'Sharma', email: 'aarav.student@demo.com', grade: 'Undergraduate · Fall 2026' },
  { firstName: 'Diya', lastName: 'Patel', email: 'diya.student@demo.com', grade: 'Undergraduate · Fall 2026' },
  { firstName: 'Rohan', lastName: 'Verma', email: 'rohan.student@demo.com', grade: 'Graduate · Spring 2027' },
  { firstName: 'Ananya', lastName: 'Iyer', email: 'ananya.student@demo.com', grade: 'Graduate · Winter 2026' },
];

async function main() {
  const passwordHash = await bcrypt.hash('Password123', 10);
  const mentors = await prisma.mentor.findMany({ select: { id: true } });
  const sampleServices = [
    { topic: 'Ivy League SOP Comprehensive Review', amount: 3500, completed: true },
    { topic: '45-min 1-on-1 Advisory Session', amount: 2500, completed: true },
    { topic: 'University Shortlisting Strategy', amount: 2000, completed: false },
    { topic: 'Study Visa Planning Session', amount: 1800, completed: false },
  ];

  for (const [candidateIndex, candidate] of candidates.entries()) {
    const user = await prisma.user.upsert({
      where: { email: candidate.email },
      update: {
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        role: Role.STUDENT,
        status: 'ACTIVE',
      },
      create: {
        email: candidate.email,
        passwordHash,
        role: Role.STUDENT,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        status: 'ACTIVE',
      },
    });

    await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: { currentGrade: candidate.grade },
      create: {
        userId: user.id,
        dob: new Date(`200${candidateIndex + 3}-0${candidateIndex + 1}-15`),
        gender: candidateIndex % 2 === 0 ? 'MALE' : 'FEMALE',
        currentGrade: candidate.grade,
      },
    });

    for (const [mentorIndex, mentor] of mentors.entries()) {
      const service = sampleServices[candidateIndex];
      const startsAt = service.completed
        ? new Date(`2026-07-${19 - candidateIndex}T16:00:00+05:30`)
        : new Date(Date.now() + (candidateIndex + mentorIndex + 1) * 24 * 60 * 60 * 1000);
      startsAt.setHours(16, 0, 0, 0);
      const sessionData = {
        date: startsAt.toISOString().slice(0, 10),
        time: '16:00',
        duration: 45,
        topic: service.topic,
        status: service.completed ? 'COMPLETED' : 'CONFIRMED',
        startsAt,
        endsAt: new Date(startsAt.getTime() + 45 * 60 * 1000),
        timezone: 'Asia/Kolkata',
        priceAmount: service.amount,
        currency: 'INR',
      };
      const existing = await prisma.session.findFirst({
        where: {
          mentorId: mentor.id,
          studentId: user.id,
        },
      });
      if (existing) {
        await prisma.session.update({
          where: { id: existing.id },
          data: sessionData,
        });
      } else {
        await prisma.session.create({
          data: {
            mentorId: mentor.id,
            studentId: user.id,
            ...sessionData,
          },
        });
      }
    }
  }

  console.log(`Assigned ${candidates.length} demo candidates to ${mentors.length} mentors.`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
