import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.blogPost.findMany({
    where: {
      slug: {
        in: [
          'the-ultimate-guide-to-bpc-157-benefits-uses-and-research-mechanisms',
          'guidelines-for-reconstituting-sourced-peptides-a-researchers-standard-protocol'
        ]
      }
    }
  });

  for (const post of posts) {
    console.log(`SLUG: ${post.slug}`);
    console.log(`FEATURED IMAGE: ${post.featuredImage}`);
    if (post.content.includes('1782296756443-pfsffl-BPC-157_10mg_juiste_foto.png') || post.content.includes('1579684389782')) {
       console.log('FOUND IN CONTENT');
    }
    if (post.translations && (post.translations.includes('1782296756443-pfsffl-BPC-157_10mg_juiste_foto.png') || post.translations.includes('1579684389782'))) {
       console.log('FOUND IN TRANSLATIONS');
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
