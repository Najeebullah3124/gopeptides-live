/**
 * Standalone: sync 33 product photos from new-brand-images/ and update the database.
 * Also runs automatically at the end of npm run prisma:seed.
 *
 * Run: npm run seed:product-images
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedProductImages } from '../prisma/seeds/productImages.seed';

const prisma = new PrismaClient();

seedProductImages(prisma)
  .then(({ files, db, skipped }) => {
    console.log(`\nDone: ${files} image(s) synced, ${db} product(s) seeded, ${skipped} skipped.`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
