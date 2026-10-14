import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedLabelMetadata } from './seeds/labelMetadata.seed';
import { seedProductImages } from './seeds/productImages.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminEmail = process.env.ADMIN_EMAIL || 'gopeptides1@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  const adminHash = await bcrypt.hash(adminPassword, 12);

  // Rename old admin if exists
  const oldAdmin = await prisma.user.findUnique({ where: { email: 'admin@gopeptides.nl' } });
  if (oldAdmin) {
    await prisma.user.update({
      where: { email: 'admin@gopeptides.nl' },
      data: { email: adminEmail },
    });
    console.log(`Renamed old admin admin@gopeptides.nl to ${adminEmail}`);
  }

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: adminHash,
      firstName: 'Admin',
      lastName: 'GoPeptides',
      role: 'ADMIN',
      emailVerified: true,
    },
  });

  const userHash = await bcrypt.hash('UserPass123!', 12);
  await prisma.user.upsert({
    where: { email: 'demo@gopeptides.nl' },
    update: {},
    create: {
      email: 'demo@gopeptides.nl',
      password: userHash,
      firstName: 'Demo',
      lastName: 'User',
      role: 'USER',
      emailVerified: true,
    },
  });

  const categories = [
    { name: 'Recovery', slug: 'recovery', description: 'Peptides supporting tissue repair and recovery research.' },
    { name: 'Anti-Aging', slug: 'anti-aging', description: 'Peptides studied for longevity and cellular health.' },
    { name: 'Cognitive', slug: 'cognitive', description: 'Nootropic peptides for cognitive research.' },
    { name: 'Hormonal', slug: 'hormonal', description: 'Growth hormone and metabolic research peptides.' },
    { name: 'Weight Management', slug: 'weight-management', description: 'Peptides researched for metabolic and body composition studies.' },
    { name: "Supplies (extra's)", slug: 'supplies-extras', description: 'Needles, boxes, and laboratory accessories for research.' },
  ];

  const categoryMap: Record<string, string> = {};
  for (const c of categories) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description },
      create: c,
    });
    categoryMap[c.slug] = cat.id;
  }

  // Products are grouped by name — same name + different weight = dosage variants
  const products = [
    // ── RECOVERY ──────────────────────────────────────────────────
    {
      name: 'BPC-157',
      slug: 'bpc-157-10mg',
      sku: 'GP-BPC157-10MG',
      categorySlug: 'recovery',
      shortDesc: 'Body Protective Compound for tissue repair research.',
      description:
        'BPC-157 is a synthetic peptide derived from a protective protein found in gastric juice. Widely studied for tissue repair, angiogenesis, and gut health applications in research settings.',
      price: 64.95,
      comparePrice: 89.95,
      stock: 87,
      purity: '>99%',
      weight: '10mg',
      casNumber: '137525-51-0',
      badge: 'Bestseller',
      isFeatured: true,
      sequence: 'Gly-Glu-Pro-Pro-Pro-Gly-Lys-Pro-Ala-Asp-Asp-Ala-Gly-Leu-Val',
      storage: 'Store lyophilized at -20°C. Reconstituted: 2-8°C up to 30 days.',
      benefits: ['Tissue repair research', 'Gut health studies', 'Angiogenesis research', 'Anti-inflammatory studies'],
      imageColor: '5CC0BE',
    },
    {
      name: 'TB-500',
      slug: 'tb-500-10mg',
      sku: 'GP-TB500-10MG',
      categorySlug: 'recovery',
      shortDesc: 'Thymosin Beta-4 fragment for muscle and tendon research.',
      description:
        'TB-500 is a synthetic version of the naturally occurring peptide Thymosin Beta-4. Studied for its role in cell migration, angiogenesis, and tissue regeneration research.',
      price: 74.95,
      comparePrice: 99.95,
      stock: 42,
      purity: '>99%',
      weight: '10mg',
      casNumber: '77591-33-4',
      badge: 'Popular',
      isFeatured: true,
      sequence: 'Ac-SDKPDMAEIEKFDKSKLKKTETQ',
      storage: 'Store lyophilized at -20°C. Reconstituted: 2-8°C up to 14 days.',
      benefits: ['Muscle recovery research', 'Tendon repair studies', 'Cell migration research', 'Cardiovascular studies'],
      imageColor: '7BD3D1',
    },
    {
      name: 'BPC-157 + TB-500',
      slug: 'bpc157-tb500-wolf-10mg',
      sku: 'GP-WOLF-10MG',
      categorySlug: 'recovery',
      shortDesc: 'Synergistic recovery stack — BPC-157 and TB-500 combined.',
      description:
        'The Wolf Stack combines BPC-157 and TB-500 for comprehensive tissue recovery and regeneration research. Both peptides complement each other in angiogenesis and repair pathways.',
      price: 119.95,
      comparePrice: 149.95,
      stock: 35,
      purity: '>99%',
      weight: '10mg+10mg',
      casNumber: '137525-51-0 / 77591-33-4',
      badge: 'Stack',
      isFeatured: false,
      storage: 'Store lyophilized at -20°C.',
      benefits: ['Combined tissue repair', 'Angiogenesis research', 'Recovery optimization', 'Gut & muscle studies'],
      imageColor: '4FAFAD',
    },
    {
      name: 'BPC-157 + TB-500',
      slug: 'bpc157-tb500-wolf-20mg',
      sku: 'GP-WOLF-20MG',
      categorySlug: 'recovery',
      shortDesc: 'Synergistic recovery stack — BPC-157 and TB-500 combined.',
      description:
        'The Wolf Stack combines BPC-157 and TB-500 for comprehensive tissue recovery and regeneration research. Both peptides complement each other in angiogenesis and repair pathways.',
      price: 219.95,
      comparePrice: 269.95,
      stock: 22,
      purity: '>99%',
      weight: '20mg+20mg',
      casNumber: '137525-51-0 / 77591-33-4',
      badge: 'Stack',
      isFeatured: false,
      storage: 'Store lyophilized at -20°C.',
      benefits: ['Combined tissue repair', 'Angiogenesis research', 'Recovery optimization', 'Gut & muscle studies'],
      imageColor: '4FAFAD',
    },

    // ── ANTI-AGING ────────────────────────────────────────────────
    {
      name: 'GHK-Cu',
      slug: 'ghk-cu-50mg',
      sku: 'GP-GHKCU-50MG',
      categorySlug: 'anti-aging',
      shortDesc: 'Copper peptide for skin and longevity research.',
      description:
        'GHK-Cu (Copper Peptide) is a naturally occurring tripeptide-copper complex. Extensively studied for its role in skin regeneration, hair follicle stimulation, and longevity research.',
      price: 44.95,
      comparePrice: 59.95,
      stock: 124,
      purity: '>99%',
      weight: '50mg',
      casNumber: '89030-95-5',
      badge: 'New',
      isFeatured: true,
      sequence: 'Gly-His-Lys (Cu²⁺)',
      storage: 'Store lyophilized at -20°C. Solution: 2-8°C protected from light.',
      benefits: ['Skin regeneration research', 'Hair growth studies', 'Anti-oxidant research', 'Wound healing studies'],
      imageColor: '5CC0BE',
    },
    {
      name: 'GHK-Cu',
      slug: 'ghk-cu-100mg',
      sku: 'GP-GHKCU-100MG',
      categorySlug: 'anti-aging',
      shortDesc: 'Copper peptide for skin and longevity research.',
      description:
        'GHK-Cu (Copper Peptide) is a naturally occurring tripeptide-copper complex. Extensively studied for its role in skin regeneration, hair follicle stimulation, and longevity research.',
      price: 79.95,
      comparePrice: 109.95,
      stock: 68,
      purity: '>99%',
      weight: '100mg',
      casNumber: '89030-95-5',
      badge: null,
      isFeatured: false,
      sequence: 'Gly-His-Lys (Cu²⁺)',
      storage: 'Store lyophilized at -20°C. Solution: 2-8°C protected from light.',
      benefits: ['Skin regeneration research', 'Hair growth studies', 'Anti-oxidant research', 'Wound healing studies'],
      imageColor: '5CC0BE',
    },
    {
      name: 'SS-31',
      slug: 'ss-31-10mg',
      sku: 'GP-SS31-10MG',
      categorySlug: 'anti-aging',
      shortDesc: 'Mitochondria-targeted antioxidant peptide for longevity research.',
      description:
        'SS-31 (Elamipretide) is a cell-permeable peptide that localizes to the inner mitochondrial membrane. Studied for its role in mitochondrial function, oxidative stress reduction, and aging research.',
      price: 84.95,
      comparePrice: 109.95,
      stock: 29,
      purity: '>99%',
      weight: '10mg',
      casNumber: '736992-21-5',
      badge: 'Premium',
      isFeatured: false,
      sequence: 'D-Arg-2\'6\'-Dmt-Lys-Phe-NH₂',
      storage: 'Store lyophilized at -20°C.',
      benefits: ['Mitochondrial research', 'Oxidative stress studies', 'Cardiac research', 'Longevity research'],
      imageColor: '0D7377',
    },
    {
      name: 'NAD+',
      slug: 'nad-500mg',
      sku: 'GP-NAD-500MG',
      categorySlug: 'anti-aging',
      shortDesc: 'Nicotinamide Adenine Dinucleotide for cellular energy research.',
      description:
        'NAD+ is a critical coenzyme found in every cell, central to energy metabolism and DNA repair. Studied for its role in aging, cellular health, and metabolic research.',
      price: 54.95,
      comparePrice: 74.95,
      stock: 93,
      purity: '>99%',
      weight: '500mg',
      casNumber: '53-84-9',
      badge: null,
      isFeatured: false,
      storage: 'Store at -20°C, protected from light and humidity.',
      benefits: ['Cellular energy research', 'DNA repair studies', 'Sirtuin activation research', 'Anti-aging studies'],
      imageColor: '7BD3D1',
    },
    {
      name: 'NAD+',
      slug: 'nad-1000mg',
      sku: 'GP-NAD-1000MG',
      categorySlug: 'anti-aging',
      shortDesc: 'Nicotinamide Adenine Dinucleotide for cellular energy research.',
      description:
        'NAD+ is a critical coenzyme found in every cell, central to energy metabolism and DNA repair. Studied for its role in aging, cellular health, and metabolic research.',
      price: 94.95,
      comparePrice: 129.95,
      stock: 51,
      purity: '>99%',
      weight: '1000mg',
      casNumber: '53-84-9',
      badge: 'Value',
      isFeatured: false,
      storage: 'Store at -20°C, protected from light and humidity.',
      benefits: ['Cellular energy research', 'DNA repair studies', 'Sirtuin activation research', 'Anti-aging studies'],
      imageColor: '7BD3D1',
    },

    // ── COGNITIVE ─────────────────────────────────────────────────
    {
      name: 'Semax',
      slug: 'semax-5mg',
      sku: 'GP-SEMAX-5MG',
      categorySlug: 'cognitive',
      shortDesc: 'Nootropic peptide for cognitive function research.',
      description:
        'Semax is a synthetic peptide developed from ACTH fragments. Researched for its nootropic effects, neuroprotection, and modulation of BDNF in cognitive studies.',
      price: 44.95,
      comparePrice: 59.95,
      stock: 58,
      purity: '>99%',
      weight: '5mg',
      casNumber: '80714-61-0',
      badge: null,
      isFeatured: true,
      sequence: 'Met-Glu-His-Phe-Pro-Gly-Pro',
      storage: 'Store lyophilized at -20°C. Solution: 2-8°C up to 30 days.',
      benefits: ['Memory research', 'BDNF modulation studies', 'Neuroprotection research', 'Cognitive enhancement studies'],
      imageColor: '5CC0BE',
    },
    {
      name: 'Semax',
      slug: 'semax-10mg',
      sku: 'GP-SEMAX-10MG',
      categorySlug: 'cognitive',
      shortDesc: 'Nootropic peptide for cognitive function research.',
      description:
        'Semax is a synthetic peptide developed from ACTH fragments. Researched for its nootropic effects, neuroprotection, and modulation of BDNF in cognitive studies.',
      price: 79.95,
      comparePrice: 99.95,
      stock: 41,
      purity: '>99%',
      weight: '10mg',
      casNumber: '80714-61-0',
      badge: 'Popular',
      isFeatured: false,
      sequence: 'Met-Glu-His-Phe-Pro-Gly-Pro',
      storage: 'Store lyophilized at -20°C. Solution: 2-8°C up to 30 days.',
      benefits: ['Memory research', 'BDNF modulation studies', 'Neuroprotection research', 'Cognitive enhancement studies'],
      imageColor: '5CC0BE',
    },
    {
      name: 'Selank',
      slug: 'selank-10mg',
      sku: 'GP-SELANK-10MG',
      categorySlug: 'cognitive',
      shortDesc: 'Anxiolytic peptide for behavioral research.',
      description:
        'Selank is a synthetic heptapeptide analogue of tuftsin. Studied for its anxiolytic and immunomodulatory properties in behavioral research.',
      price: 44.95,
      comparePrice: null,
      stock: 73,
      purity: '>99%',
      weight: '10mg',
      casNumber: '129954-34-3',
      badge: null,
      isFeatured: false,
      sequence: 'Thr-Lys-Pro-Arg-Pro-Gly-Pro',
      storage: 'Store lyophilized at -20°C.',
      benefits: ['Anxiety research', 'Immune modulation studies', 'GABA receptor research', 'Behavioral studies'],
      imageColor: '7BD3D1',
    },
    {
      name: '5-Amino-1MQ',
      slug: '5-amino-1mq-50mg',
      sku: 'GP-5A1MQ-50MG',
      categorySlug: 'cognitive',
      shortDesc: 'NNMT inhibitor studied for metabolic and cognitive research.',
      description:
        '5-Amino-1MQ is a small molecule inhibitor of nicotinamide N-methyltransferase (NNMT). Studied for its potential role in metabolic regulation, fat cell reduction, and cognitive function.',
      price: 69.95,
      comparePrice: 89.95,
      stock: 44,
      purity: '>99%',
      weight: '50mg',
      casNumber: '1993-65-3',
      badge: 'New',
      isFeatured: false,
      storage: 'Store at -20°C, dry conditions.',
      benefits: ['NNMT inhibition research', 'Metabolic studies', 'Fat cell research', 'NAD+ pathway studies'],
      imageColor: '4FAFAD',
    },
    {
      name: 'Mots-C',
      slug: 'mots-c-5mg',
      sku: 'GP-MOTSC-5MG',
      categorySlug: 'cognitive',
      shortDesc: 'Mitochondrial peptide for metabolic and longevity research.',
      description:
        'Mots-C is a mitochondria-derived peptide encoded by the mitochondrial 12S rRNA gene. Studied for its role in metabolic regulation, insulin sensitivity, and physical performance.',
      price: 64.95,
      comparePrice: 84.95,
      stock: 38,
      purity: '>99%',
      weight: '5mg',
      casNumber: '1456648-83-1',
      badge: null,
      isFeatured: false,
      sequence: 'MRWQEMGYIFYPRKLR',
      storage: 'Store lyophilized at -20°C.',
      benefits: ['Mitochondrial research', 'Insulin sensitivity studies', 'Exercise physiology research', 'Longevity studies'],
      imageColor: '0D7377',
    },
    {
      name: 'Mots-C',
      slug: 'mots-c-10mg',
      sku: 'GP-MOTSC-10MG',
      categorySlug: 'cognitive',
      shortDesc: 'Mitochondrial peptide for metabolic and longevity research.',
      description:
        'Mots-C is a mitochondria-derived peptide encoded by the mitochondrial 12S rRNA gene. Studied for its role in metabolic regulation, insulin sensitivity, and physical performance.',
      price: 114.95,
      comparePrice: 149.95,
      stock: 22,
      purity: '>99%',
      weight: '10mg',
      casNumber: '1456648-83-1',
      badge: 'Value',
      isFeatured: false,
      sequence: 'MRWQEMGYIFYPRKLR',
      storage: 'Store lyophilized at -20°C.',
      benefits: ['Mitochondrial research', 'Insulin sensitivity studies', 'Exercise physiology research', 'Longevity studies'],
      imageColor: '0D7377',
    },

    // ── HORMONAL ──────────────────────────────────────────────────
    {
      name: 'CJC-1295 + Ipamorelin',
      slug: 'cjc1295-ipamorelin-5mg',
      sku: 'GP-CJCIPA-5MG',
      categorySlug: 'hormonal',
      shortDesc: 'GHRH + GHRP synergistic GH-releasing stack.',
      description:
        'CJC-1295 combined with Ipamorelin provides a synergistic approach to growth hormone secretagogue research. CJC-1295 extends GH pulse duration while Ipamorelin selectively stimulates GH release.',
      price: 99.95,
      comparePrice: 129.95,
      stock: 47,
      purity: '>99%',
      weight: '5mg+5mg',
      casNumber: '863288-34-0 / 170851-70-4',
      badge: 'Stack',
      isFeatured: true,
      storage: 'Store lyophilized at -20°C.',
      benefits: ['GHRH + GHRP synergy', 'GH secretion research', 'IGF-1 studies', 'Body composition research'],
      imageColor: '5CC0BE',
    },
    {
      name: 'CJC-1295 + Ipamorelin',
      slug: 'cjc1295-ipamorelin-10mg',
      sku: 'GP-CJCIPA-10MG',
      categorySlug: 'hormonal',
      shortDesc: 'GHRH + GHRP synergistic GH-releasing stack.',
      description:
        'CJC-1295 combined with Ipamorelin provides a synergistic approach to growth hormone secretagogue research. CJC-1295 extends GH pulse duration while Ipamorelin selectively stimulates GH release.',
      price: 184.95,
      comparePrice: 239.95,
      stock: 27,
      purity: '>99%',
      weight: '10mg+10mg',
      casNumber: '863288-34-0 / 170851-70-4',
      badge: 'Stack',
      isFeatured: false,
      storage: 'Store lyophilized at -20°C.',
      benefits: ['GHRH + GHRP synergy', 'GH secretion research', 'IGF-1 studies', 'Body composition research'],
      imageColor: '5CC0BE',
    },
    {
      name: 'Tesamorelin',
      slug: 'tesamorelin-5mg',
      sku: 'GP-TESA-5MG',
      categorySlug: 'hormonal',
      shortDesc: 'GHRH analogue for abdominal fat and GH research.',
      description:
        'Tesamorelin is a synthetic analogue of GHRH (growth hormone-releasing hormone). Studied for stimulating GH secretion and its applications in metabolic and body composition research.',
      price: 89.95,
      comparePrice: 114.95,
      stock: 33,
      purity: '>99%',
      weight: '5mg',
      casNumber: '218949-48-9',
      badge: null,
      isFeatured: false,
      storage: 'Store lyophilized at -20°C.',
      benefits: ['GHRH research', 'GH secretion studies', 'Abdominal fat research', 'Metabolic studies'],
      imageColor: '7BD3D1',
    },
    {
      name: 'Tesamorelin',
      slug: 'tesamorelin-10mg',
      sku: 'GP-TESA-10MG',
      categorySlug: 'hormonal',
      shortDesc: 'GHRH analogue for abdominal fat and GH research.',
      description:
        'Tesamorelin is a synthetic analogue of GHRH (growth hormone-releasing hormone). Studied for stimulating GH secretion and its applications in metabolic and body composition research.',
      price: 164.95,
      comparePrice: 209.95,
      stock: 18,
      purity: '>99%',
      weight: '10mg',
      casNumber: '218949-48-9',
      badge: 'Value',
      isFeatured: false,
      storage: 'Store lyophilized at -20°C.',
      benefits: ['GHRH research', 'GH secretion studies', 'Abdominal fat research', 'Metabolic studies'],
      imageColor: '7BD3D1',
    },

    // ── WEIGHT MANAGEMENT ─────────────────────────────────────────
    {
      name: 'Retatrutide',
      slug: 'retatrutide-10mg',
      sku: 'GP-RETA-10MG',
      categorySlug: 'weight-management',
      shortDesc: 'Triple agonist peptide for metabolic and weight research.',
      description:
        'Retatrutide is a triple agonist of GLP-1, GIP, and glucagon receptors. Among the most studied next-generation weight management peptides in clinical research settings.',
      price: 79.95,
      comparePrice: 99.95,
      stock: 52,
      purity: '>99%',
      weight: '10mg',
      casNumber: '2413189-69-0',
      badge: null,
      isFeatured: false,
      storage: 'Store lyophilized at -20°C.',
      benefits: ['GLP-1 agonism research', 'GIP receptor studies', 'Glucagon receptor research', 'Metabolic studies'],
      imageColor: 'C4952F',
    },
    {
      name: 'Retatrutide',
      slug: 'retatrutide-15mg',
      sku: 'GP-RETA-15MG',
      categorySlug: 'weight-management',
      shortDesc: 'Triple agonist peptide for metabolic and weight research.',
      description:
        'Retatrutide is a triple agonist of GLP-1, GIP, and glucagon receptors. Among the most studied next-generation weight management peptides in clinical research settings.',
      price: 109.95,
      comparePrice: 139.95,
      stock: 38,
      purity: '>99%',
      weight: '15mg',
      casNumber: '2413189-69-0',
      badge: null,
      isFeatured: false,
      storage: 'Store lyophilized at -20°C.',
      benefits: ['GLP-1 agonism research', 'GIP receptor studies', 'Glucagon receptor research', 'Metabolic studies'],
      imageColor: 'C4952F',
    },
    {
      name: 'Retatrutide',
      slug: 'retatrutide-20mg',
      sku: 'GP-RETA-20MG',
      categorySlug: 'weight-management',
      shortDesc: 'Triple agonist peptide for metabolic and weight research.',
      description:
        'Retatrutide is a triple agonist of GLP-1, GIP, and glucagon receptors. Among the most studied next-generation weight management peptides in clinical research settings.',
      price: 139.95,
      comparePrice: 179.95,
      stock: 29,
      purity: '>99%',
      weight: '20mg',
      casNumber: '2413189-69-0',
      badge: 'Popular',
      isFeatured: true,
      storage: 'Store lyophilized at -20°C.',
      benefits: ['GLP-1 agonism research', 'GIP receptor studies', 'Glucagon receptor research', 'Metabolic studies'],
      imageColor: 'C4952F',
    },
    {
      name: 'Retatrutide',
      slug: 'retatrutide-30mg',
      sku: 'GP-RETA-30MG',
      categorySlug: 'weight-management',
      shortDesc: 'Triple agonist peptide for metabolic and weight research.',
      description:
        'Retatrutide is a triple agonist of GLP-1, GIP, and glucagon receptors. Among the most studied next-generation weight management peptides in clinical research settings.',
      price: 189.95,
      comparePrice: 239.95,
      stock: 21,
      purity: '>99%',
      weight: '30mg',
      casNumber: '2413189-69-0',
      badge: null,
      isFeatured: false,
      storage: 'Store lyophilized at -20°C.',
      benefits: ['GLP-1 agonism research', 'GIP receptor studies', 'Glucagon receptor research', 'Metabolic studies'],
      imageColor: 'C4952F',
    },
    {
      name: 'Retatrutide',
      slug: 'retatrutide-60mg',
      sku: 'GP-RETA-60MG',
      categorySlug: 'weight-management',
      shortDesc: 'Triple agonist peptide for metabolic and weight research.',
      description:
        'Retatrutide is a triple agonist of GLP-1, GIP, and glucagon receptors. Among the most studied next-generation weight management peptides in clinical research settings.',
      price: 329.95,
      comparePrice: 409.95,
      stock: 14,
      purity: '>99%',
      weight: '60mg',
      casNumber: '2413189-69-0',
      badge: 'Value',
      isFeatured: false,
      storage: 'Store lyophilized at -20°C.',
      benefits: ['GLP-1 agonism research', 'GIP receptor studies', 'Glucagon receptor research', 'Metabolic studies'],
      imageColor: 'C4952F',
    },
    {
      name: 'Tirzepatide',
      slug: 'tirzepatide-10mg',
      sku: 'GP-TIRZ-10MG',
      categorySlug: 'weight-management',
      shortDesc: 'Dual GLP-1/GIP receptor agonist for metabolic research.',
      description:
        'Tirzepatide is a dual glucose-dependent insulinotropic polypeptide (GIP) and glucagon-like peptide-1 (GLP-1) receptor agonist. Extensively researched for its metabolic effects.',
      price: 84.95,
      comparePrice: 109.95,
      stock: 64,
      purity: '>99%',
      weight: '10mg',
      casNumber: '2023788-19-2',
      badge: null,
      isFeatured: false,
      storage: 'Store lyophilized at -20°C.',
      benefits: ['Dual GLP-1/GIP research', 'Insulin secretion studies', 'Metabolic research', 'Body composition studies'],
      imageColor: 'E8553D',
    },
    {
      name: 'Tirzepatide',
      slug: 'tirzepatide-15mg',
      sku: 'GP-TIRZ-15MG',
      categorySlug: 'weight-management',
      shortDesc: 'Dual GLP-1/GIP receptor agonist for metabolic research.',
      description:
        'Tirzepatide is a dual glucose-dependent insulinotropic polypeptide (GIP) and glucagon-like peptide-1 (GLP-1) receptor agonist. Extensively researched for its metabolic effects.',
      price: 119.95,
      comparePrice: 149.95,
      stock: 48,
      purity: '>99%',
      weight: '15mg',
      casNumber: '2023788-19-2',
      badge: 'Popular',
      isFeatured: true,
      storage: 'Store lyophilized at -20°C.',
      benefits: ['Dual GLP-1/GIP research', 'Insulin secretion studies', 'Metabolic research', 'Body composition studies'],
      imageColor: 'E8553D',
    },
    {
      name: 'Tirzepatide',
      slug: 'tirzepatide-20mg',
      sku: 'GP-TIRZ-20MG',
      categorySlug: 'weight-management',
      shortDesc: 'Dual GLP-1/GIP receptor agonist for metabolic research.',
      description:
        'Tirzepatide is a dual glucose-dependent insulinotropic polypeptide (GIP) and glucagon-like peptide-1 (GLP-1) receptor agonist. Extensively researched for its metabolic effects.',
      price: 149.95,
      comparePrice: 189.95,
      stock: 35,
      purity: '>99%',
      weight: '20mg',
      casNumber: '2023788-19-2',
      badge: null,
      isFeatured: false,
      storage: 'Store lyophilized at -20°C.',
      benefits: ['Dual GLP-1/GIP research', 'Insulin secretion studies', 'Metabolic research', 'Body composition studies'],
      imageColor: 'E8553D',
    },
    {
      name: 'Tirzepatide',
      slug: 'tirzepatide-30mg',
      sku: 'GP-TIRZ-30MG',
      categorySlug: 'weight-management',
      shortDesc: 'Dual GLP-1/GIP receptor agonist for metabolic research.',
      description:
        'Tirzepatide is a dual glucose-dependent insulinotropic polypeptide (GIP) and glucagon-like peptide-1 (GLP-1) receptor agonist. Extensively researched for its metabolic effects.',
      price: 199.95,
      comparePrice: 249.95,
      stock: 26,
      purity: '>99%',
      weight: '30mg',
      casNumber: '2023788-19-2',
      badge: null,
      isFeatured: false,
      storage: 'Store lyophilized at -20°C.',
      benefits: ['Dual GLP-1/GIP research', 'Insulin secretion studies', 'Metabolic research', 'Body composition studies'],
      imageColor: 'E8553D',
    },
    {
      name: 'Tirzepatide',
      slug: 'tirzepatide-60mg',
      sku: 'GP-TIRZ-60MG',
      categorySlug: 'weight-management',
      shortDesc: 'Dual GLP-1/GIP receptor agonist for metabolic research.',
      description:
        'Tirzepatide is a dual glucose-dependent insulinotropic polypeptide (GIP) and glucagon-like peptide-1 (GLP-1) receptor agonist. Extensively researched for its metabolic effects.',
      price: 349.95,
      comparePrice: 439.95,
      stock: 16,
      purity: '>99%',
      weight: '60mg',
      casNumber: '2023788-19-2',
      badge: 'Value',
      isFeatured: false,
      storage: 'Store lyophilized at -20°C.',
      benefits: ['Dual GLP-1/GIP research', 'Insulin secretion studies', 'Metabolic research', 'Body composition studies'],
      imageColor: 'E8553D',
    },
    {
      name: 'Cagrilintide',
      slug: 'cagrilintide-5mg',
      sku: 'GP-CAGR-5MG',
      categorySlug: 'weight-management',
      shortDesc: 'Long-acting amylin analogue for appetite and metabolic research.',
      description:
        'Cagrilintide is a long-acting amylin analogue investigated for its effects on appetite regulation and body weight. Studied in combination protocols for metabolic research.',
      price: 94.95,
      comparePrice: 119.95,
      stock: 31,
      purity: '>99%',
      weight: '5mg',
      casNumber: '2253257-08-4',
      badge: null,
      isFeatured: false,
      storage: 'Store lyophilized at -20°C.',
      benefits: ['Amylin receptor research', 'Appetite regulation studies', 'Metabolic research', 'Combination protocol studies'],
      imageColor: '4FAFAD',
    },
    {
      name: 'Cagrilintide',
      slug: 'cagrilintide-10mg',
      sku: 'GP-CAGR-10MG',
      categorySlug: 'weight-management',
      shortDesc: 'Long-acting amylin analogue for appetite and metabolic research.',
      description:
        'Cagrilintide is a long-acting amylin analogue investigated for its effects on appetite regulation and body weight. Studied in combination protocols for metabolic research.',
      price: 169.95,
      comparePrice: 214.95,
      stock: 19,
      purity: '>99%',
      weight: '10mg',
      casNumber: '2253257-08-4',
      badge: 'Value',
      isFeatured: false,
      storage: 'Store lyophilized at -20°C.',
      benefits: ['Amylin receptor research', 'Appetite regulation studies', 'Metabolic research', 'Combination protocol studies'],
      imageColor: '4FAFAD',
    },
    {
      name: 'GLOW',
      slug: 'glow-50mg',
      sku: 'GP-GLOW-50MG',
      categorySlug: 'weight-management',
      shortDesc: 'Advanced peptide blend for comprehensive metabolic research.',
      description:
        'GLOW is a premium research blend combining select peptides for comprehensive metabolic and wellness studies. Formulated for researchers studying synergistic peptide interactions.',
      price: 129.95,
      comparePrice: 169.95,
      stock: 28,
      purity: '>99%',
      weight: '50mg',
      casNumber: 'Proprietary blend',
      badge: 'Blend',
      isFeatured: false,
      storage: 'Store lyophilized at -20°C, protected from light.',
      benefits: ['Synergistic research', 'Metabolic studies', 'Comprehensive wellness research', 'Multi-target studies'],
      imageColor: '5CC0BE',
    },
    {
      name: 'KLOW',
      slug: 'klow-80mg',
      sku: 'GP-KLOW-80MG',
      categorySlug: 'weight-management',
      shortDesc: 'Advanced peptide blend for metabolic optimization research.',
      description:
        'KLOW is a specialized research blend combining complementary peptides for targeted metabolic studies. Designed for researchers studying multi-pathway metabolic interactions.',
      price: 149.95,
      comparePrice: 189.95,
      stock: 24,
      purity: '>99%',
      weight: '80mg',
      casNumber: 'Proprietary blend',
      badge: 'Blend',
      isFeatured: false,
      storage: 'Store lyophilized at -20°C, protected from light.',
      benefits: ['Multi-pathway research', 'Metabolic optimization studies', 'Synergistic studies', 'Body composition research'],
      imageColor: '0D7377',
    },
  ];

  // Wipe existing products so the seed is always idempotent (dev only)
  await prisma.image.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.wishlist.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.product.deleteMany({});

  for (const p of products) {
    const { categorySlug, imageColor, ...data } = p;
    const benefitsJson = JSON.stringify(data.benefits);
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        ...data,
        benefits: benefitsJson,
        categoryId: categoryMap[categorySlug],
      },
      create: {
        ...data,
        benefits: benefitsJson,
        categoryId: categoryMap[categorySlug],
      },
    });
  }

  // Product photos: ../new-brand-images/ → public/products/ + Image rows in DB
  const imageResult = await seedProductImages(prisma);

  const coupons = [
    { code: 'WELCOME10', discount: 10, type: 'percent', minOrder: 0, isActive: true },
    { code: 'GOPEP10', discount: 10, type: 'percent', minOrder: 50, isActive: true },
    { code: 'WELCOME15', discount: 15, type: 'percent', minOrder: 75, maxUses: 500, isActive: true },
    { code: 'BULK20', discount: 20, type: 'percent', minOrder: 200, isActive: true },
    { code: 'FIRST10', discount: 10, type: 'fixed', minOrder: 30, isActive: true },
    { code: 'RESEARCH5', discount: 5, type: 'percent', isActive: true },
  ];

  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: c,
      create: c,
    });
  }

  const defaultSettings = [
    { key: 'email_alerts_enabled', value: 'true' },
    { key: 'email_alerts_recipients', value: 'gopeptides1@gmail.com' },
    { key: 'telegram_enabled', value: 'true' },
    { key: 'telegram_bot_token', value: '8880659129:AAF0lIRskNI1OO2quPk3jXxzwk-PG0ijxOA' },
    { key: 'telegram_chat_id', value: '5568978968' },
    { key: 'printnode_enabled', value: 'false' },
  ];

  for (const s of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
  }

  const reviewProducts = await prisma.product.findMany({ orderBy: { createdAt: 'asc' } });
  const reviewSeeds = [
    { rating: 5, title: 'Exceptional purity', body: 'HPLC trace matched our independent verification. Switched all procurement here.', name: 'Dr. M. Chen' },
    { rating: 5, title: 'Reliable batch consistency', body: 'Twelfth order — purity has been above 99% on every CoA. Highly recommended for lab work.', name: 'Dr. J. Müller' },
    { rating: 4, title: 'Fast delivery, great packaging', body: 'Arrived in 36 hours from Rotterdam. Cold-chain packaging was intact. Lyophilization quality solid.', name: 'A. Petrov' },
    { rating: 5, title: 'Top tier product', body: 'Reconstitution went smoothly. Stability data matched what was advertised. Will reorder.', name: 'S. Larsen' },
    { rating: 5, title: 'CoA is thorough', body: 'Documentation includes lot number, HPLC trace, MS confirmation. Saved us hours of internal QA.', name: 'P. Romano' },
    { rating: 5, title: 'Customer service responsive', body: 'Had a technical question about storage — got a detailed answer in 4 hours. Impressive.', name: 'Dr. K. Fischer' },
    { rating: 4, title: 'Great value', body: 'Comparable purity to competitors at 30% lower cost. The bulk discount helps when sourcing for multiple studies.', name: 'L. Andersen' },
    { rating: 5, title: 'Consistent across batches', body: 'Used three different batches over six months — no observable variance in our assays.', name: 'Dr. R. Costa' },
    { rating: 5, title: 'Perfect for research', body: 'Exactly what we needed for our neurology study. Well-labeled vials, clear storage instructions.', name: 'M. Schneider' },
    { rating: 4, title: 'Solid product', body: 'Slight delay with customs but the team kept us updated. Product itself is excellent quality.', name: 'F. Dubois' },
    { rating: 5, title: 'Great storage docs', body: 'The reconstitution and storage guides are the best I have seen. Clearly written by someone who actually does the work.', name: 'Dr. N. Patel' },
    { rating: 5, title: 'Premium feel', body: 'From ordering to unboxing, everything feels professional. Glass vials, proper labels, sealed packaging.', name: 'O. Berg' },
    { rating: 5, title: 'Best supplier so far', body: 'Tried four EU suppliers — GoPeptides has the cleanest paper trail and best product. Sticking with them.', name: 'Dr. I. Kowalski' },
    { rating: 4, title: 'Recommended for institutions', body: 'Our procurement office accepted their documentation without follow-up questions. That alone saves us time.', name: 'S. van der Berg' },
    { rating: 5, title: 'Lab-ready quality', body: 'Tested independently — matches the certificate. Will be ordering in bulk for the next study.', name: 'Dr. T. Rossi' },
    { rating: 5, title: 'Fast and reliable', body: 'Five orders in a row, all on time, all up to spec. Becoming our default research peptide source.', name: 'A. Holm' },
    { rating: 4, title: 'Excellent technical support', body: 'Asked for clarification on the sequence — got a citation list within an hour. That is rare.', name: 'Dr. E. Vogt' },
    { rating: 5, title: 'Clean reconstitution', body: 'No precipitates, no cloudiness. Dissolves cleanly in bacteriostatic water as documented.', name: 'M. Janssen' },
    { rating: 5, title: 'Trustworthy supplier', body: 'Have referred three other labs. All three have continued ordering. That is the highest endorsement I can give.', name: 'Dr. C. Almeida' },
    { rating: 5, title: 'Worth the price', body: 'Marginally more expensive than the cheapest options but you can actually trust the CoA. That is worth a premium.', name: 'Dr. H. Lindqvist' },
  ];

  for (let i = 0; i < reviewSeeds.length; i++) {
    const r = reviewSeeds[i];
    const product = reviewProducts[i % reviewProducts.length];
    await prisma.review.upsert({
      where: { id: `seed-review-${i}` },
      update: {},
      create: {
        id: `seed-review-${i}`,
        productId: product.id,
        guestName: r.name,
        rating: r.rating,
        title: r.title,
        body: r.body,
        verified: true,
        approved: true,
      },
    });
  }

  // ── BLOG SEEDING ───────────────────────────────────────────────
  const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });

  const blogCategories = [
    { name: 'Research Guides', slug: 'research-guides', description: 'Standardized protocols and manuals for peptide researchers.' },
    { name: 'Peptide Science', slug: 'peptide-science', description: 'Deep dives into biochemistry, molecular properties, and mechanisms.' },
    { name: 'Clinical Trials', slug: 'clinical-trials', description: 'Summaries of active and historical research studies.' }
  ];

  const blogCategoryMap: Record<string, string> = {};
  for (const bc of blogCategories) {
    const cat = await prisma.blogCategory.upsert({
      where: { slug: bc.slug },
      update: { name: bc.name, description: bc.description },
      create: bc,
    });
    blogCategoryMap[bc.slug] = cat.id;
  }

  const blogPosts = [
    {
      title: 'BPC-157: A Comprehensive Scientific Review of Gastric Pentadecapeptide',
      slug: 'bpc-157-scientific-review',
      excerpt: 'An in-depth review of the therapeutic potential, molecular mechanism, and tissue healing properties of gastric protective peptide BPC-157.',
      featuredImage: '/photos/why-tested.webp?v=2',
      status: 'PUBLISHED',
      categoryId: blogCategoryMap['peptide-science'],
      authorId: adminUser.id,
      tags: JSON.stringify(['BPC-157', 'Recovery', 'Angiogenesis']),
      seoTitle: 'BPC-157 Scientific Review & Healing Properties',
      seoDescription: 'Explore the biochemical research, mechanism, and recovery applications of the gastric protective peptide BPC-157 in laboratory models.',
      readTime: 6,
      publishedAt: new Date(),
      content: `### Introduction\n\nBPC-157 (Body Protective Compound-157) is a synthetic pentadecapeptide composed of 15 amino acids. It is a sequence derived from a protective protein discovered in human gastric juice. Researchers have focused on this compound due to its high stability and diverse regenerative properties.\n\n### Mechanism of Action\n\nUnlike many other peptides, BPC-157 exerts its biological effects through several molecular channels:\n\n1. **Upregulation of Growth Factors**: Studies demonstrate that BPC-157 significantly increases the expression of **Vascular Endothelial Growth Factor (VEGF)** and its receptor VEGFR2, promoting angiogenesis (the formation of new blood vessels).\n2. **Nitric Oxide (NO) Synthesis Modulation**: It stabilizes the production of nitric oxide, which plays a critical role in regulating vascular tone and managing inflammatory responses.\n3. **Collagen Organization**: The peptide enhances the expression of EGR1 (Early Growth Response 1), leading to increased collagen production and structured alignment, essential for tendon and ligament healing.\n\n### Key Research Applications\n\n* **Soft Tissue Repair**: Research indicates that BPC-157 accelerates the healing of transected Achilles tendons and collateral ligaments in animal studies.\n* **Gastrointestinal Protection**: Due to its origin, BPC-157 is widely studied for its ability to protect the gut lining, reverse NSAID-induced gastric ulcers, and manage inflammatory bowel disease (IBD) markers.\n* **Systemic Anti-inflammatory Effects**: It interacts with the growth hormone pathway to downregulate pro-inflammatory cytokines such as TNF-alpha and IL-6.\n\n### Reconstitution and Stability\n\nBPC-157 is highly resistant to enzymatic degradation, allowing it to remain stable in gastric juice and aqueous solutions. However, for research purposes, it is reconstituted in sterile bacteriostatic water and stored at temperatures of 2-8°C after reconstitution to ensure absolute stability.`
    },
    {
      title: 'Thymosin Beta-4 (TB-500) and Angiogenesis: Key Studies and Mechanisms',
      slug: 'tb-500-angiogenesis-mechanisms',
      excerpt: 'Exploring how Thymosin Beta-4 (TB-500) stimulates blood vessel growth, cell migration, and tendon repair in laboratory models.',
      featuredImage: '/photos/why-logistics.webp?v=2',
      status: 'PUBLISHED',
      categoryId: blogCategoryMap['research-guides'],
      authorId: adminUser.id,
      tags: JSON.stringify(['TB-500', 'Angiogenesis', 'Cell Migration']),
      seoTitle: 'TB-500 Peptide: Angiogenesis and Healing Studies',
      seoDescription: 'Dive into the mechanism of Thymosin Beta-4 (TB-500) and its role in accelerating cellular migration and tissue repair in research.',
      readTime: 5,
      publishedAt: new Date(),
      content: `### Overview of Thymosin Beta-4\n\nThymosin Beta-4 (Tβ4) is a highly abundant, naturally occurring protein consisting of 43 amino acids. In research circles, the synthetic fragment representing its active domain is frequently referred to as **TB-500**. Tβ4 is found in high concentrations in blood platelets and wound fluid, serving as one of the body's primary responses to tissue injury.\n\n### The Role of Actin Polymerization\n\nOne of the most remarkable properties of TB-500 is its role as the major G-actin sequestering peptide. By preventing G-actin from polymerizing into F-actin, it maintains a pool of actin monomers available for rapid remodeling. This directly facilitates:\n\n* **Cell Migration**: Accelerating the movement of endothelial cells and fibroblasts to the site of an injury.\n* **Dermal Wound Healing**: Boosting re-epithelialization of skin lesions.\n* **Tendon Remodeling**: Improving the elasticity and recovery speed of damaged dense connective tissues.\n\n### Angiogenic Properties\n\nTB-500 is a potent stimulator of angiogenesis. By promoting the migration and differentiation of endothelial cells, it assists in laying down new capillary networks. This increases the supply of oxygen and essential nutrients to recovering tissues, which is highly beneficial in ischemic injury models.\n\n### Research Implications\n\nWhile TB-500 shows excellent promise in wound healing and cardiovascular models, its potent cell-migratory and angiogenic effects require careful isolation. Ongoing laboratory studies are map-charting its interactions in chronic wound environments, cardiac infarction repair, and ophthalmic corneal healing.`
    },
    {
      title: 'Sermorelin and Growth Hormone Secretagogues in Anti-Aging Research',
      slug: 'sermorelin-growth-hormone-secretagogues',
      excerpt: 'A study on Sermorelin\'s molecular profile and its effect on stimulating growth hormone release in age-related research.',
      featuredImage: '/photos/why-docs.webp?v=2',
      status: 'PUBLISHED',
      categoryId: blogCategoryMap['peptide-science'],
      authorId: adminUser.id,
      tags: JSON.stringify(['Sermorelin', 'GHRH', 'Secretagogues']),
      seoTitle: 'Sermorelin Peptide Research: Anti-Aging and GH Release',
      seoDescription: 'Read about the GHRH analogue Sermorelin and how growth hormone secretagogues are evaluated in age-related metabolic research.',
      readTime: 5,
      publishedAt: new Date(),
      content: `### Introduction to Growth Hormone Secretagogues\n\nGrowth Hormone Secretagogues (GHS) are a class of peptides designed to stimulate the pituitary gland to secrete endogenous Growth Hormone (GH). Among these, **Sermorelin** (Sermorelin Acetate) stands as a prominent research compound. It is a synthetic 29-amino acid peptide representing the active amino-terminal segment of naturally occurring Growth Hormone-Releasing Hormone (GHRH 1-44).\n\n### Contrast: Exogenous GH vs. GHRH Analogues\n\nDirect administration of exogenous Growth Hormone can suppress the body\'s natural feedback loop, leading to tachyphylaxis and pituitary shutdown. Sermorelin, however, works high up in the signaling cascade:\n\n1. It binds directly to the GHRH receptors in the anterior pituitary.\n2. It triggers a natural, pulsatile release of Growth Hormone, preserving the body\'s negative feedback regulation via somatostatin.\n3. It indirectly increases circular levels of **IGF-1** (Insulin-like Growth Factor 1) via hepatic synthesis.\n\n### Scientific Evaluation in Longevity Models\n\nResearchers analyze Sermorelin and related secretagogues (like Ipamorelin or CJC-1295) for several age-related physiological markers:\n\n* **Body Composition**: Studies evaluate its role in increasing lean muscle mass index and accelerating lipolysis (fat breakdown).\n* **Sleep Quality**: GHRH analogues influence slow-wave sleep patterns, which are vital for cellular repair.\n* **Immune Support**: Somatotropic signaling plays a role in thymic rejuvenation and maintaining t-cell population diversity.\n\n### Current Research Directions\n\nOngoing clinical and in vitro research is focused on fine-tuning the half-life of GHRH analogues. Modifying secretagogues to resist peptidase degradation allows researchers to achieve longer exposure windows to better study cellular senescence and metabolic regeneration.`
    },
    {
      title: 'Cognitive Enhancement Peptides: The Science Behind Semax and Selank',
      slug: 'cognitive-enhancement-peptides-semax-selank',
      excerpt: 'Investigating the neuroprotective and nootropic properties of Semax and Selank in clinical neurochemical studies.',
      featuredImage: '/photos/why-tested.webp?v=2',
      status: 'PUBLISHED',
      categoryId: blogCategoryMap['peptide-science'],
      authorId: adminUser.id,
      tags: JSON.stringify(['Nootropic', 'Semax', 'Selank', 'Neuroprotection']),
      seoTitle: 'Semax & Selank: Nootropic Peptide Research Overview',
      seoDescription: 'Explore the science behind the synthetic neuropeptides Semax and Selank, their mechanisms, and their cognitive applications.',
      readTime: 7,
      publishedAt: new Date(),
      content: `### Neuroactive Peptides\n\nNeuroactive peptides represent a specialized branch of biochemistry focused on modifying central nervous system (CNS) responses. Unlike traditional small-molecule nootropics, peptides like **Semax** and **Selank** interact directly with complex neurotransmitter and trophic networks to promote brain health and cognitive resilience.\n\n### Semax: The BDNF Booster\n\nSemax is a synthetic peptide derived from a fragment of the adrenocorticotropic hormone (ACTH 4-10). It has been stripped of its endocrine activity, meaning it does not stimulate the adrenal cortex. Its primary mechanisms include:\n\n* **Upregulation of BDNF**: It increases the expression of **Brain-Derived Neurotrophic Factor** and its receptor TrkB in the hippocampus, aiding synaptic plasticity and memory formation.\n* **Neuroprotection**: It stabilizes cells under conditions of hypoxia, protecting neurons from oxidative stress and glutamate excitotoxicity.\n* **Dopaminergic System Interaction**: Semax increases the turn-over of dopamine and serotonin, enhancing focus and processing speed.\n\n### Selank: The Anxiolytic Peptide\n\nSelank is a synthetic analogue of the immunomodulatory peptide **Tuftsin**. It is modified with a glyproline sequence to stabilize it against peptidase degradation in the bloodstream. In research, Selank behaves as a stable anxiolytic:\n\n* **GABAergic Modulation**: It enhances GABA (gamma-aminobutyric acid) signaling, exerting a calming effect without causing sedation.\n* **Enkephalin Stabilization**: It inhibits the enzymes that break down enkephalins (natural pain-relieving peptides), indirectly improving mood.\n* **Immune-CNS Crosstalk**: Selank regulates IL-6 expression, demonstrating a dual role in modulating neuroinflammation.\n\n### Summary of Nootropic Research\n\nBoth Semax and Selank provide researchers with unique biochemical models to study memory consolidation, ADHD-like phenotypes, anxiety-related behaviors, and neurodegenerative decline without the dependency risks associated with stimulant-based agents.`
    },
    {
      title: 'Guidelines for Reconstituting Sourced Peptides: A Researcher\'s Standard Protocol',
      slug: 'guidelines-reconstituting-peptides-protocol',
      excerpt: 'Standardized laboratory procedures for reconstitution, storage, and calculations of lyophilized research compounds.',
      featuredImage: '/photos/why-tested.webp?v=2',
      status: 'PUBLISHED',
      categoryId: blogCategoryMap['research-guides'],
      authorId: adminUser.id,
      tags: JSON.stringify(['Reconstitution', 'Protocol', 'Bacteriostatic Water']),
      seoTitle: 'Peptide Reconstitution Protocol & Guide',
      seoDescription: 'Follow the standard laboratory protocol for reconstituting, calculating concentrations, and storing lyophilized peptides.',
      readTime: 4,
      publishedAt: new Date(),
      content: `### Introduction to Reconstitution\n\nPeptides are typically shipped in a lyophilized (freeze-dried) state to preserve molecular stability during transport. Reconstitution is the process of dissolving this powder back into a liquid state for laboratory analysis. Doing this correctly is vital to avoid degrading the fragile peptide bonds.\n\n### Recommended Materials\n\n* **Bacteriostatic Water (0.9% Benzyl Alcohol)**: Highly recommended for multi-use research vials, as benzyl alcohol prevents bacterial replication.\n* **Sterile Water**: Suitable if the entire vial will be analyzed immediately.\n* **Alcohol Swabs**: To sanitize the vial stoppers before access.\n* **Insulin Syringes**: Used for high-precision volume measurements.\n\n### Step-by-Step Laboratory Protocol\n\n1. **Equilibrate**: Let the lyophilized vial reach room temperature before adding liquid to prevent condensation inside the glass.\n2. **Sanitize**: Wipe the rubber stopper of the peptide vial and the diluent vial with an alcohol swab.\n3. **Draw Diluent**: Draw the desired amount of bacteriostatic water (typically 1.0mL to 2.0mL) into the syringe.\n4. **Incorporate Slowly**: Insert the needle at a 45-degree angle. Aim the stream of diluent at the glass wall of the vial. **Never spray liquid directly onto the powder**, as the physical force can shear the delicate peptide structure.\n5. **Dissolve**: Allow the liquid to absorb the powder. If necessary, gently roll the vial between your palms. **Do not shake the vial**, as shaking creates foam which denatures the proteins.\n\n### Storage and Preservation\n\nOnce reconstituted, peptides must be stored in a refrigerator at 2-8°C. They should be shielded from light and vibration (which can disrupt tertiary structures). For long-term preservation, aliquot the solution and freeze at -20°C or -80°C. Avoid repeated freeze-thaw cycles, as they rapidly degrade the peptide bonds.`
    }
  ];

  for (const bp of blogPosts) {
    await prisma.blogPost.upsert({
      where: { slug: bp.slug },
      update: bp,
      create: bp,
    });
  }

  await seedLabelMetadata(prisma);

  console.log('Seed complete.');
  console.log(`  Admin: ${adminEmail} / ${adminPassword}`);
  console.log(`  Demo user: demo@gopeptides.nl / UserPass123!`);
  console.log(`  Products seeded: ${products.length}`);
  console.log(`  Product images: ${imageResult.db} from new-brand-images/ (${imageResult.files} files)`);
  console.log(`  Reviews: ${reviewSeeds.length}`);
  console.log(`  Blog Posts: ${blogPosts.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
