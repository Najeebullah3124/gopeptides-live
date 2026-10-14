/** Update label variant batch/storage/shelf data from seed without wiping products. */
import { PrismaClient } from '@prisma/client';
import { seedLabelMetadata } from '../prisma/seeds/labelMetadata.seed';

const prisma = new PrismaClient();

seedLabelMetadata(prisma)
  .then(() => console.log('Label metadata seeded.'))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
