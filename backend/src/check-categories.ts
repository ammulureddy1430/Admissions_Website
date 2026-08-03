import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const schools = await prisma.school.findMany();
  console.log('SCHOOLS:', schools.map(s => ({ id: s.id, name: s.name })));
  
  const categories = await prisma.gameCategory.findMany();
  console.log('CATEGORIES IN DB:', categories);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
