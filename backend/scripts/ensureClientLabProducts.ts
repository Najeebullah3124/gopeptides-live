/**
 * Ensure live-only SKUs exist locally so client text lab reports can attach.
 * Minimal active products (shop-visible) matching production slugs/SKUs.
 *
 * Usage: npx tsx scripts/ensureClientLabProducts.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRODUCTS = [
  {
    name: 'Acetic Acid Water',
    slug: 'aawater-10ml',
    sku: 'GP-AA-10MG',
    weight: '10 ml',
    purity: '—',
    casNumber: '64-19-7',
    shortDesc: 'Acetic acid water for research reconstitution.',
    description: 'Acetic acid water 10 ml for research use.',
    price: 9.95,
  },
  {
    name: 'Epitalon',
    slug: 'epi-thalon',
    sku: 'GP-EPI-10MG',
    weight: '10 mg',
    purity: '>99%',
    casNumber: '307297-39-8',
    shortDesc: 'Epitalon (Epithalon) research peptide.',
    description: 'Epitalon 10 mg lyophilized research peptide.',
    price: 39.95,
  },
  {
    name: 'Ipamorelin',
    slug: 'ipa-morelin',
    sku: 'GP-IPA-10MG',
    weight: '10 mg',
    purity: '>99%',
    casNumber: '170851-70-4',
    shortDesc: 'Ipamorelin research peptide.',
    description: 'Ipamorelin 10 mg lyophilized research peptide.',
    price: 39.95,
  },
  {
    name: 'Melanotan I',
    slug: 'melanotan-10mg',
    sku: 'GP-MELA-10MG',
    weight: '10 mg',
    purity: '>99%',
    casNumber: '75921-69-6',
    shortDesc: 'Melanotan I research peptide.',
    description: 'Melanotan I 10 mg lyophilized research peptide.',
    price: 34.95,
  },
  {
    name: 'PT-141',
    slug: 'pt141-10mg',
    sku: 'GP-PTP141-10MG',
    weight: '10 mg',
    purity: '>99%',
    casNumber: '189691-06-3',
    shortDesc: 'PT-141 (bremelanotide) research peptide.',
    description: 'PT-141 10 mg lyophilized research peptide.',
    price: 39.95,
  },
] as const;

async function main() {
  const cat =
    (await prisma.category.findFirst({ where: { slug: 'supplies-extras' } })) ||
    (await prisma.category.findFirst({ where: { slug: 'recovery' } })) ||
    (await prisma.category.findFirst());
  if (!cat) throw new Error('No category in DB');

  let created = 0;
  let existed = 0;

  for (const row of PRODUCTS) {
    const found = await prisma.product.findFirst({
      where: { OR: [{ slug: row.slug }, { sku: row.sku }] },
      select: { id: true, slug: true },
    });
    if (found) {
      console.log('EXISTS', found.slug);
      existed++;
      continue;
    }
    await prisma.product.create({
      data: {
        name: row.name,
        slug: row.slug,
        sku: row.sku,
        weight: row.weight,
        purity: row.purity,
        casNumber: row.casNumber,
        shortDesc: row.shortDesc,
        description: row.description,
        price: row.price,
        stock: 20,
        categoryId: cat.id,
        isActive: true,
        isFeatured: false,
        benefits: '[]',
        translations: '{}',
        seoData: '{}',
      },
    });
    console.log('CREATED', row.slug);
    created++;
  }

  console.log(`Done: ${created} created, ${existed} already present`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
