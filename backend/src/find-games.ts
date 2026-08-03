import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const games = await prisma.generatedGame.findMany({
    include: { template: true }
  });
  console.log('GENERATED GAMES IN DB:', games.map(g => ({
    id: g.id,
    title: g.title,
    template: g.template?.name,
    status: g.status
  })));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
