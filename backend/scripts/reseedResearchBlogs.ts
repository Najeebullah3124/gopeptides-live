import { prisma } from '../src/config/database';
import { publishErrors } from '../src/controllers/blogController';
import fs from 'node:fs';
import path from 'node:path';

type SeedPost = {
  title: string;
  slug: string;
  category: string;
  date: string;
  topic: string;
  seoTitle: string;
};

const posts: SeedPost[] = [
  { title: "Guidelines for Reconstituting Sourced Peptides: A Researcher's Standard Protocol", slug: 'guidelines-for-reconstituting-sourced-peptides-a-researchers-standard-protocol', category: 'Research Guides', date: '2026-06-18', topic: 'research peptide reconstitution records and laboratory handling', seoTitle: 'Research Peptide Reconstitution Protocol | Guide' },
  { title: 'Cognitive Enhancement Peptides: The Science Behind Semax and Selank', slug: 'cognitive-enhancement-peptides-the-science-behind-semax-and-selank', category: 'Peptide Science', date: '2026-06-18', topic: 'Semax and Selank research literature', seoTitle: 'Semax and Selank Research | Evidence Overview' },
  { title: 'Sermorelin and Growth Hormone Secretagogues in Anti-Aging Research', slug: 'sermorelin-and-growth-hormone-secretagogues-in-anti-aging-research', category: 'Peptide Science', date: '2026-06-18', topic: 'sermorelin and growth hormone secretagogue research', seoTitle: 'Sermorelin Research | Evidence and Limitations' },
  { title: 'Thymosin Beta-4 (TB-500) and Angiogenesis: Key Studies and Mechanisms', slug: 'thymosin-beta-4-tb-500-and-angiogenesis-key-studies-and-mechanisms', category: 'Research Guides', date: '2026-06-18', topic: 'thymosin beta-4 and angiogenesis research', seoTitle: 'TB-500 Angiogenesis Research | Study Overview' },
  { title: 'BPC-157: A Comprehensive Scientific Review of Gastric Pentadecapeptide', slug: 'bpc-157-a-comprehensive-scientific-review-of-gastric-pentadecapeptide', category: 'Peptide Science', date: '2026-06-18', topic: 'BPC-157 and gastric pentadecapeptide research', seoTitle: 'BPC-157 Research Review | Evidence and Scope' },
  { title: "Peptide Storage & Reconstitution: A Researcher's Practical Guide", slug: 'peptide-storage-and-reconstitution-a-researchers-practical-guide', category: 'Guides', date: '2026-05-12', topic: 'peptide storage, records, and reconstitution methods', seoTitle: 'Peptide Storage and Reconstitution | Research Guide' },
  { title: 'BPC-157: Mechanisms of Gastrointestinal and Musculoskeletal Repair', slug: 'bpc-157-mechanisms-of-gastrointestinal-and-musculoskeletal-repair', category: 'Science', date: '2026-05-19', topic: 'BPC-157 gastrointestinal and musculoskeletal research', seoTitle: 'BPC-157 Mechanisms | Research Evidence Review' },
  { title: 'Overview of Thymosin Beta-4 (TB-500)', slug: 'overview-of-thymosin-beta-4-tb-500', category: 'Research', date: '2026-05-26', topic: 'thymosin beta-4 research', seoTitle: 'Thymosin Beta-4 Research | TB-500 Overview' },
  { title: "How to Read a Peptide Certificate of Analysis: A Researcher's Checklist", slug: 'how-to-read-a-peptide-certificate-of-analysis-researchers-checklist', category: 'Research Methods', date: '2026-06-24', topic: 'peptide certificate of analysis interpretation', seoTitle: 'How to Read a Peptide CoA | Research Checklist' },
];

function safeFeaturedImage(value?: string | null): string {
  if (!value) return '/photos/why-tested.webp?v=2';
  if (value.startsWith('/photos/')) return value;
  if (value.startsWith('/uploads/')) {
    const localPath = path.join(process.cwd(), 'uploads', value.slice('/uploads/'.length));
    if (fs.existsSync(localPath)) return value;
  }
  return '/photos/why-tested.webp?v=2';
}

function metaDescription(topic: string) {
  const value = `Research-only overview of ${topic}. Covers study context, evidence limits, documentation, and careful interpretation of peer-reviewed literature.`;
  return value.length > 160 ? `${value.slice(0, 157).trimEnd()}...` : value;
}

function articleContent(title: string, topic: string) {
  const sourceUrl = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(topic)}`;
  return `<h2>Research scope</h2><p>${title} is written as an educational overview for laboratory and literature-review use. The purpose is to help readers frame ${topic} as a research question rather than as a treatment claim. Peptide research spans different model systems, formulations, analytical methods, and study endpoints. Those differences matter when comparing results, because findings from one setting do not automatically transfer to another. This article therefore focuses on terminology, record keeping, evidence quality, and the limits of interpretation. It is not medical advice and it does not describe products for human use.</p><h2>How to read the evidence</h2><p>Start by identifying the model, comparator, outcome measure, and observation period used in each paper. A result can be interesting without being conclusive. In vitro work may clarify a pathway, while animal studies can test a broader biological response; neither alone establishes a clinical conclusion. Look for independent replication, transparent methods, appropriate controls, and discussion of limitations. Pay attention to whether an article reports measured outcomes or only proposes a mechanism. Separate background rationale from direct evidence, and avoid treating a review article as if it were a new experiment.</p><h3>Documentation and traceability</h3><p>Good research records connect the material, its analytical documentation, the protocol version, the storage history, and the observed result. Record the batch identifier, date received, storage condition, preparation notes, instrument settings, and deviations from the planned method. When comparing sources, confirm that concentration units, purity methods, and sequence descriptions mean the same thing. A certificate of analysis is one part of traceability; it should be read with the method, chromatogram or spectrum where available, and the stated acceptance criteria. Documentation does not replace replication, but it makes later review possible.</p><h2>Practical reading checklist</h2><ul><li>Define the exact research question before collecting references.</li><li>Prefer primary studies and systematic reviews over unsupported summaries.</li><li>Record species, model, endpoints, and study limitations.</li><li>Keep analytical and handling records with the experimental notebook.</li><li>Distinguish exploratory findings from conclusions supported by replicated evidence.</li></ul><h2>Questions for further work</h2><p>Before relying on a paper, note what it does not answer. Ask whether the sample size was adequate for the stated outcome, whether the analysis plan was defined before results were known, and whether negative findings were reported. Check whether the material was characterized with methods appropriate to the research question and whether the authors identify plausible confounders. A careful reader also distinguishes statistical significance from practical significance. These questions do not invalidate early-stage work; they place it in the correct evidentiary context and show where replication, improved measurement, or broader comparison would be most useful.</p><h2>Limitations and research-only context</h2><p>The literature on ${topic} can contain small studies, variable methods, and unresolved questions. A responsible summary names those limits instead of filling gaps with certainty. Readers should consult the original publication, follow institutional procedures, and use appropriately trained supervision for any laboratory work. No statement in this article should be read as a dosage recommendation, diagnostic claim, or instruction for human consumption. The useful outcome of a research guide is a better question, a clearer record, and a more careful reading of the available evidence.</p><h2>Further reading</h2><p>Use <a href="${sourceUrl}" target="_blank">PubMed search results for ${topic}</a> to locate primary literature and reviews relevant to the research question.</p>`;
}

async function main() {
  const [author, existing] = await Promise.all([
    prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' } }),
    prisma.blogPost.findMany({ select: { slug: true, featuredImage: true } }),
  ]);
  if (!author) throw new Error('No admin user exists to own the reseeded blog posts.');

  const prepared = posts.map((post) => {
    const existingImage = existing.find((item) => item.slug === post.slug)?.featuredImage;
    const featuredImage = safeFeaturedImage(existingImage);
    const featuredImageAlt = `Laboratory research context for ${post.topic}`;
    const content = articleContent(post.title, post.topic);
    const seoDescription = metaDescription(post.topic);
    const errors = publishErrors({ content, featuredImage: featuredImage || undefined, featuredImageAlt, seoTitle: post.seoTitle, seoDescription });
    if (errors.length) throw new Error(`${post.slug}: ${errors.join('. ')}`);
    return { ...post, content, featuredImage, featuredImageAlt, seoDescription };
  });

  await prisma.$transaction(async (tx) => {
    const categories = new Map<string, string>();
    for (const categoryName of [...new Set(prepared.map((post) => post.category))]) {
      const category = await tx.blogCategory.upsert({
        where: { name: categoryName },
        update: {},
        create: { name: categoryName, slug: categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') },
      });
      categories.set(categoryName, category.id);
    }

    await tx.blogPost.deleteMany();
    await tx.blogPost.createMany({ data: prepared.map((post) => ({
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.seoDescription,
      featuredImage: post.featuredImage,
      featuredImageAlt: post.featuredImageAlt,
      status: 'PUBLISHED',
      categoryId: categories.get(post.category),
      authorId: author.id,
      tags: JSON.stringify(['research', 'peptides']),
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
      seoData: JSON.stringify({ focusKeywords: [post.topic], robots: 'index,follow', socialImage: post.featuredImage }),
      readTime: 4,
      baseLanguage: 'en',
      publishedAt: new Date(`${post.date}T12:00:00.000Z`),
    })) });
  });

  console.log(`Replaced all blog posts with ${prepared.length} SEO-ready research articles.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
