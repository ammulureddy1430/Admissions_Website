import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const gameId = '0d45c44c-797a-4810-b6ed-821f4617d7d5';
  console.log('Attempting to delete generated game:', gameId);
  
  const deleted = await prisma.generatedGame.delete({
    where: { id: gameId }
  });
  
  console.log('Successfully deleted generated game:', deleted.title);
}

main()
  .catch(e => console.error('DELETE ERROR:', e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
