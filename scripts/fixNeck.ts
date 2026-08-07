import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.exercise.updateMany({
    where: {
      name: {
        in: ['Neck Side Bending', 'Isometric Neck Flexion']
      }
    },
    data: {
      trackingMode: 'B',
      targetHoldSeconds: 10
    }
  });
  console.log(`Updated ${result.count} exercises.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
