const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seed() {
  try {
    const user = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!user) {
      console.error('No admin user found. Cannot seed blogs.');
      process.exit(1);
    }

    const htmlContent = `
      <h2>This is an H2 Heading</h2>
      <p>This is a paragraph testing <strong>Bold (B)</strong>, <em>Italic (I)</em>, and <del>Strikethrough (S)</del> text formatting.</p>
      
      <h3>This is an H3 Heading</h3>
      <p>Here is an unordered (bullet) list:</p>
      <ul>
        <li>First item</li>
        <li>Second item</li>
        <li>Third item</li>
      </ul>
      
      <h4>This is an H4 Heading</h4>
      <p>Here is an ordered (numbered) list:</p>
      <ol>
        <li>Step one</li>
        <li>Step two</li>
        <li>Step three</li>
      </ol>
      
      <blockquote>
        "This is a blockquote to test the Quote feature. It should be styled nicely."
      </blockquote>
      
      <p>Let's look at some code snippet:</p>
      <pre><code>
function test() {
  console.log("Hello World");
}
      </code></pre>
      
      <p>Check out this <a href="https://example.com" target="_blank">External Link</a> for more info.</p>
      
      <p>And here is an image:</p>
      <img src="https://picsum.photos/600/300" alt="Test Image" />
    `;

    for (let i = 1; i <= 5; i++) {
      const slug = 'test-rich-text-blog-post-' + i;
      
      // Delete if exists
      const existing = await prisma.blogPost.findUnique({ where: { slug } });
      if (existing) {
        await prisma.blogPost.delete({ where: { slug } });
      }

      await prisma.blogPost.create({
        data: {
          title: 'Test Rich Text Editor Blog Post ' + i,
          slug,
          excerpt: 'This is a test blog post to verify all rich text editor elements work properly including headings, lists, quotes, code, links, and images.',
          content: htmlContent,
          status: 'PUBLISHED',
          authorId: user.id,
          baseLanguage: 'en',
          tags: JSON.stringify(['Test', 'Editor', 'Rich Text']),
          publishedAt: new Date()
        }
      });
      console.log('Created blog post', i);
    }
    console.log('Successfully seeded 5 test blog posts.');
  } catch (error) {
    console.error('Error seeding blogs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
