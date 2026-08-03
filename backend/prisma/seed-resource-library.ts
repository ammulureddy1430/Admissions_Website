import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const bucket = process.env.MINIO_BUCKET || 'admissionsos';
const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
const port = process.env.MINIO_PORT || '9000';
const storage = new S3Client({
  region: 'us-east-1',
  endpoint: `http://${endpoint}:${port}`,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  },
  forcePathStyle: true,
});

const samples = [
  {
    title: 'Ivy League SOP Blueprint 2026.pdf',
    path: resolve(process.cwd(), '../output/pdf/Ivy-League-SOP-Blueprint-2026.pdf'),
    type: 'PDF',
    contentType: 'application/pdf',
  },
  {
    title: 'Professor LOR Structure & Guidelines.docx',
    path: resolve(process.cwd(), '../output/docx/Professor-LOR-Structure-and-Guidelines.docx'),
    type: 'DOCX',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
];

async function main() {
  const mentors = await prisma.mentor.findMany({ select: { id: true } });
  let created = 0;

  for (const mentor of mentors) {
    for (const sample of samples) {
      const existing = await prisma.mentorResource.findFirst({
        where: { mentorId: mentor.id, title: sample.title },
      });
      if (existing) continue;

      const bytes = await readFile(sample.path);
      const info = await stat(sample.path);
      const key = `mentor-resources/${mentor.id}/samples/${sample.path.split('/').pop()}`;
      await storage.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: bytes,
        ContentType: sample.contentType,
      }));
      await prisma.mentorResource.create({
        data: {
          mentorId: mentor.id,
          title: sample.title,
          description: `${(info.size / 1024 / 1024).toFixed(2)} MB`,
          type: sample.type,
          url: `http://${endpoint}:${port}/${bucket}/${key}`,
          published: true,
        },
      });
      created += 1;
    }
  }

  console.log(`Created ${created} sample resource records for ${mentors.length} mentors.`);
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
