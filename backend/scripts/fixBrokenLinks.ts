import { prisma } from '../src/config/database';

async function main() {
  console.log('Finding and replacing broken image links in blog posts...');

  const posts = await prisma.blogPost.findMany({
    where: {
      content: {
        contains: '1782296756443-pfsffl-BPC-157_10mg_juiste_foto.png',
      },
    },
  });

  console.log(`Found ${posts.length} posts with the BPC-157 image error.`);
  for (const post of posts) {
    const updatedContent = post.content.replace(
      /<img[^>]+1782296756443-pfsffl-BPC-157_10mg_juiste_foto\.png[^>]+>/g,
      ''
    );
    await prisma.blogPost.update({
      where: { id: post.id },
      data: { content: updatedContent },
    });
    console.log(`Fixed post: ${post.title}`);
  }

  const posts2 = await prisma.blogPost.findMany({
    where: {
      content: {
        contains: 'photo-1579684389782-64d84b5e901a',
      },
    },
  });

  console.log(`Found ${posts2.length} posts with the photo-1579684389782 error.`);
  for (const post of posts2) {
    const updatedContent = post.content.replace(
      /<img[^>]+photo-1579684389782-64d84b5e901a[^>]+>/g,
      ''
    );
    await prisma.blogPost.update({
      where: { id: post.id },
      data: { content: updatedContent },
    });
    console.log(`Fixed post: ${post.title}`);
  }

  console.log('Broken links removed.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
