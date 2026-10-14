const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const res = await prisma.review.deleteMany({
        where: { id: { startsWith: 'seed-review-' } }
    });
    console.log(`Deleted ${res.count} dummy reviews!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
