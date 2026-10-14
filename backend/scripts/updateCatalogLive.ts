import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: 'weight-management', name: 'Gewichtsbeheer & Energie Onderzoek' },
  { slug: 'recovery', name: 'Herstel & Huid Onderzoek' },
  { slug: 'hormonal', name: 'Groei & Prestatie Onderzoek' },
  { slug: 'cognitive', name: 'Focus & Kalmte Onderzoek' },
  { slug: 'anti-aging', name: 'Longevity & Vitaliteit Onderzoek' },
  { slug: 'supplies-extras', name: 'Toebehoren & Benodigdheden' },
  { slug: 'melanocortin', name: 'Melanocortine Onderzoek' } // New
];

// Extracting all product information from user input
const PRODUCTS = [
  { name: 'Retatrutide', weight: '5 mg', price: 49.95, catSlug: 'weight-management', sku: 'GP-RETA-5MG', badge: 'Instapdosering', sequence: '39 aminozuren, GIP-gebaseerd triple-agonist', cas: '2381089-83-2', storage: 'A' },
  { name: 'Retatrutide', weight: '10 mg', price: 79.95, catSlug: 'weight-management', sku: 'GP-RETA-10MG', badge: 'Bestseller', sequence: '39 aminozuren, GIP-gebaseerd triple-agonist', cas: '2381089-83-2', storage: 'A' },
  { name: 'Retatrutide', weight: '20 mg', price: 139.95, catSlug: 'weight-management', sku: 'GP-RETA-20MG', badge: 'Populair', sequence: '39 aminozuren, GIP-gebaseerd triple-agonist', cas: '2381089-83-2', storage: 'A' },
  { name: 'Retatrutide', weight: '30 mg', price: 179.95, catSlug: 'weight-management', sku: 'GP-RETA-30MG', badge: 'Voordeel', sequence: '39 aminozuren, GIP-gebaseerd triple-agonist', cas: '2381089-83-2', storage: 'A' },
  { name: 'Retatrutide', weight: '40 mg', price: 229.95, catSlug: 'weight-management', sku: 'GP-RETA-40MG', badge: 'Hoogste Concentratie', sequence: '39 aminozuren, GIP-gebaseerd triple-agonist', cas: '2381089-83-2', storage: 'A' },
  { name: 'Retatrutide', weight: '60 mg', price: 294.95, catSlug: 'weight-management', sku: 'GP-RETA-60MG', badge: 'Hoogste Concentratie', sequence: '39 aminozuren, GIP-gebaseerd triple-agonist', cas: '2381089-83-2', storage: 'A' },
  
  { name: 'Tirzepatide', weight: '10 mg', price: 54.95, catSlug: 'weight-management', sku: 'GP-TIRZ-10MG', badge: 'Bestseller', sequence: '39 aminozuren, gebaseerd op GIP-backbone', cas: '2023788-19-2', storage: 'A' },
  { name: 'Tirzepatide', weight: '15 mg', price: 74.95, catSlug: 'weight-management', sku: 'GP-TIRZ-15MG', badge: 'Meest Onderzocht', sequence: '39 aminozuren, gebaseerd op GIP-backbone', cas: '2023788-19-2', storage: 'A' },
  { name: 'Tirzepatide', weight: '20 mg', price: 89.95, catSlug: 'weight-management', sku: 'GP-TIRZ-20MG', badge: 'Bestseller', sequence: '39 aminozuren, gebaseerd op GIP-backbone', cas: '2023788-19-2', storage: 'A' },
  { name: 'Tirzepatide', weight: '30 mg', price: 129.95, catSlug: 'weight-management', sku: 'GP-TIRZ-30MG', badge: 'Voordeel', sequence: '39 aminozuren, gebaseerd op GIP-backbone', cas: '2023788-19-2', storage: 'A' },
  { name: 'Tirzepatide', weight: '40 mg', price: 176.95, catSlug: 'weight-management', sku: 'GP-TIRZ-40MG', badge: 'Hoogste Concentratie', sequence: '39 aminozuren, gebaseerd op GIP-backbone', cas: '2023788-19-2', storage: 'A' },
  { name: 'Tirzepatide', weight: '60 mg', price: 226.95, catSlug: 'weight-management', sku: 'GP-TIRZ-60MG', badge: 'Hoogste Concentratie', sequence: '39 aminozuren, gebaseerd op GIP-backbone', cas: '2023788-19-2', storage: 'A' },
  
  { name: 'Cagrilintide', weight: '5 mg', price: 49.95, catSlug: 'weight-management', sku: 'GP-CAGR-5MG', badge: 'Instapdosering', sequence: '37 aminozuren, geacyleerd amylineanaloog', cas: '1415456-99-3', storage: 'A' },
  { name: 'Cagrilintide', weight: '10 mg', price: 84.95, catSlug: 'weight-management', sku: 'GP-CAGR-10MG', badge: 'Trending', sequence: '37 aminozuren, geacyleerd amylineanaloog', cas: '1415456-99-3', storage: 'A' },
  
  { name: 'Semax', weight: '5 mg', price: 27.95, catSlug: 'cognitive', sku: 'GP-SEMAX-5MG', badge: 'Onderzoeksfavoriet', sequence: 'Met-Glu-His-Phe-Pro-Gly-Pro', cas: '80714-61-0', storage: 'A' },
  { name: 'Semax', weight: '10 mg', price: 34.95, catSlug: 'cognitive', sku: 'GP-SEMAX-10MG', badge: 'Voordeel', sequence: 'Met-Glu-His-Phe-Pro-Gly-Pro', cas: '80714-61-0', storage: 'A' },
  
  { name: 'Selank', weight: '5 mg', price: 29.95, catSlug: 'cognitive', sku: 'GP-SELANK-5MG', badge: 'Onderzoeksfavoriet', sequence: 'Thr-Lys-Pro-Arg-Pro-Gly-Pro', cas: '129954-34-3', storage: 'A' },
  { name: 'Selank', weight: '10 mg', price: 49.95, catSlug: 'cognitive', sku: 'GP-SELANK-10MG', badge: 'Voordeel', sequence: 'Thr-Lys-Pro-Arg-Pro-Gly-Pro', cas: '129954-34-3', storage: 'A' },
  
  { name: 'Epitalon', weight: '10 mg', price: 39.95, catSlug: 'anti-aging', sku: 'GP-EPI-10MG', badge: 'Longevity Klassieker', sequence: 'Ala-Glu-Asp-Gly', cas: '307297-39-8', storage: 'A' },
  
  { name: 'PT-141', weight: '10 mg', price: 54.95, catSlug: 'melanocortin', sku: 'GP-PTP141-10MG', badge: 'Specialistisch', sequence: 'Ac-Nle-cyclo[Asp-His-DPhe-Arg-Trp-Lys]-OH', cas: '189691-06-3', storage: 'A' },
  
  { name: 'Melanotan I', weight: '10 mg', price: 49.95, catSlug: 'melanocortin', sku: 'GP-MELA-10MG', badge: 'Specialistisch', sequence: 'Ac-Ser-Tyr-Ser-Nle-Glu-His-DPhe-Arg-Trp-Gly-Lys-Pro-Val-NH2', cas: '75921-69-6', storage: 'A' },
  
  { name: 'GHK-Cu', weight: '50 mg', price: 34.95, catSlug: 'recovery', sku: 'GP-GHKCU-50MG', badge: 'Meest Gekozen', sequence: 'Gly-His-Lys (1:1 kopercomplex)', cas: '89030-95-5', storage: 'A' },
  { name: 'GHK-Cu', weight: '100 mg', price: 49.95, catSlug: 'recovery', sku: 'GP-GHKCU-100MG', badge: 'Voordeelverpakking', sequence: 'Gly-His-Lys (1:1 kopercomplex)', cas: '89030-95-5', storage: 'A' },
  
  { name: 'BPC-157', weight: '10 mg', price: 59.95, catSlug: 'recovery', sku: 'GP-BPC157-10MG', badge: 'Bestseller', sequence: 'Gly-Glu-Pro-Pro-Pro-Gly-Lys-Pro-Ala-Asp-Asp-Ala-Gly-Leu-Val', cas: '137525-51-0', storage: 'A' },
  { name: 'BPC-157', weight: '20 mg', price: 89.95, catSlug: 'recovery', sku: 'GP-BPC157-20MG', badge: 'Voordeelverpakking', sequence: 'Gly-Glu-Pro-Pro-Pro-Gly-Lys-Pro-Ala-Asp-Asp-Ala-Gly-Leu-Val', cas: '137525-51-0', storage: 'A' },
  
  { name: 'TB-500', weight: '10 mg', price: 59.95, catSlug: 'recovery', sku: 'GP-TB500-10MG', badge: 'Herstelfavoriet', sequence: 'Ac-Leu-Lys-Lys-Thr-Glu-Thr-Gln', cas: '885340-08-9', storage: 'A' },
  
  { name: 'MOTS-C', weight: '5 mg', price: 29.95, catSlug: 'anti-aging', sku: 'GP-MOTSC-5MG', badge: 'Instapdosering', sequence: 'Met-Arg-Trp-Gln-Glu-Met-Gly-Tyr-Ile-Phe-Tyr-Pro-Arg-Lys-Leu-Arg', cas: '1627580-64-6', storage: 'A' },
  { name: 'MOTS-C', weight: '10 mg', price: 44.95, catSlug: 'anti-aging', sku: 'GP-MOTSC-10MG', badge: 'Longevity Favoriet', sequence: 'Met-Arg-Trp-Gln-Glu-Met-Gly-Tyr-Ile-Phe-Tyr-Pro-Arg-Lys-Leu-Arg', cas: '1627580-64-6', storage: 'A' },
  
  { name: 'KPV', weight: '30 mg', price: 89.95, catSlug: 'recovery', sku: 'GP-KPV-30MG', badge: 'Aanvullend', sequence: 'Lys-Pro-Val', cas: '67727-97-3', storage: 'A' },
  
  { name: 'CJC-1295 + Ipamorelin', weight: '5 mg+5 mg', price: 59.95, catSlug: 'hormonal', sku: 'GP-CJCIPA-5MG', badge: 'Voordeelblend', sequence: 'CJC-1295: Tyr-DAla-Asp-Ala-Ile-Phe-Thr-Gln-Ser-Tyr-Arg-Lys-Val-Leu-Ala-Gln-Leu-Ser-Ala-Arg-Lys-Leu-Leu-Gln-Asp-Ile-Leu-Ser-Arg-NH2 · Ipamorelin: Aib-His-D2Nal-DPhe-Lys-NH2', cas: 'CJC-1295 (no DAC): 446036-97-1 · Ipamorelin: 170851-70-4', storage: 'A' },
  { name: 'CJC-1295 + Ipamorelin', weight: '10 mg+10 mg', price: 99.95, catSlug: 'hormonal', sku: 'GP-CJCIPA-10MG', badge: 'Voordeelblend', sequence: 'CJC-1295: Tyr-DAla-Asp-Ala-Ile-Phe-Thr-Gln-Ser-Tyr-Arg-Lys-Val-Leu-Ala-Gln-Leu-Ser-Ala-Arg-Lys-Leu-Leu-Gln-Asp-Ile-Leu-Ser-Arg-NH2 · Ipamorelin: Aib-His-D2Nal-DPhe-Lys-NH2', cas: 'CJC-1295 (no DAC): 446036-97-1 · Ipamorelin: 170851-70-4', storage: 'A' },
  
  { name: 'BPC-157 + TB-500', weight: '5 mg+5 mg', price: 59.95, catSlug: 'recovery', sku: 'GP-WOLF-10MG', badge: 'Populair Blend', sequence: 'BPC-157: Gly-Glu-Pro-Pro-Pro-Gly-Lys-Pro-Ala-Asp-Asp-Ala-Gly-Leu-Val · TB-500: Ac-Leu-Lys-Lys-Thr-Glu-Thr-Gln', cas: 'BPC-157: 137525-51-0 · TB-500: 885340-08-9', storage: 'A' },
  { name: 'BPC-157 + TB-500', weight: '10 mg+10 mg', price: 109.95, catSlug: 'recovery', sku: 'GP-WOLF-20MG', badge: 'Bestseller Blend', sequence: 'BPC-157: Gly-Glu-Pro-Pro-Pro-Gly-Lys-Pro-Ala-Asp-Asp-Ala-Gly-Leu-Val · TB-500: Ac-Leu-Lys-Lys-Thr-Glu-Thr-Gln', cas: 'BPC-157: 137525-51-0 · TB-500: 885340-08-9', storage: 'A' },
  
  { name: '5-Amino-1MQ', weight: '50 mg', price: 53.95, catSlug: 'anti-aging', sku: 'GP-5A1MQ-50MG', badge: 'Trending', sequence: 'n.v.t. (kleine molecuulverbinding, geen peptide)', cas: '42464-96-0 (jodidezout)', storage: 'C' },
  
  { name: 'KLOW', weight: '80 mg', price: 109.95, catSlug: 'recovery', sku: 'GP-KLOW-80MG', badge: 'Compleet Blend', sequence: 'Zie samenstellende onderdelen', cas: 'Blend — zie GHK-Cu (89030-95-5), BPC-157 (137525-51-0), TB-500 (885340-08-9), KPV (67727-97-3)', storage: 'A' },
  
  { name: 'GLOW', weight: '70 mg', price: 99.95, catSlug: 'recovery', sku: 'GP-GLOW-50MG', badge: 'Compleet Blend', sequence: 'Zie samenstellende onderdelen', cas: 'Blend — zie GHK-Cu (89030-95-5), BPC-157 (137525-51-0), TB-500 (885340-08-9)', storage: 'A' },
  
  { name: 'SS-31', weight: '10 mg', price: 39.95, catSlug: 'anti-aging', sku: 'GP-SS31-10MG', badge: 'Longevity Favoriet', sequence: 'DArg-Dmt-Lys-Phe-NH2 (Dmt = 2\',6\'-dimethyltyrosine)', cas: '736992-21-5', storage: 'A' },
  
  { name: 'NAD+', weight: '500 mg', price: 59.95, catSlug: 'anti-aging', sku: 'GP-NAD-500MG', badge: 'Instapdosering', sequence: 'n.v.t. (dinucleotide co-enzym, geen peptide)', cas: '53-84-9', storage: 'A' },
  { name: 'NAD+', weight: '1000 mg', price: 99.95, catSlug: 'anti-aging', sku: 'GP-NAD-1000MG', badge: 'Meest Gekozen', sequence: 'n.v.t. (dinucleotide co-enzym, geen peptide)', cas: '53-84-9', storage: 'A' },
  
  { name: 'DSIP', weight: '5 mg', price: 34.95, catSlug: 'cognitive', sku: 'GP-DSIP-5MG', badge: 'In Onderzoek', sequence: 'Trp-Ala-Gly-Gly-Asp-Ala-Ser-Gly-Glu', cas: '62568-57-4', storage: 'A' },
  
  { name: 'Ipamorelin', weight: '10 mg', price: 49.95, catSlug: 'hormonal', sku: 'GP-IPA-10MG', badge: 'Bestseller', sequence: 'Aib-His-D2Nal-DPhe-Lys-NH2', cas: '170851-70-4', storage: 'A' },
  
  { name: 'Tesamorelin', weight: '5 mg', price: 44.95, catSlug: 'hormonal', sku: 'GP-TESA-5MG', badge: 'Instapdosering', sequence: '44 aminozuren (GRF 1-44-analoog met N-terminale trans-3-hexenoylgroep)', cas: '218949-48-5', storage: 'A' },
  { name: 'Tesamorelin', weight: '10 mg', price: 69.95, catSlug: 'hormonal', sku: 'GP-TESA-10MG', badge: 'Specialistisch', sequence: '44 aminozuren (GRF 1-44-analoog met N-terminale trans-3-hexenoylgroep)', cas: '218949-48-5', storage: 'A' },
  
  { name: 'Lemon Bottle', weight: '10 ml', price: 79.95, catSlug: 'supplies-extras', sku: 'GP-LEMON-10ML', badge: 'Professioneel Gebruik', sequence: 'n.v.t.', cas: 'Mengsel — riboflavine 83-88-5, bromelaïne 9001-00-7, lecithine 8002-43-5', storage: 'B' }, // Storage is actually custom, I'll set it in the script
  
  { name: 'BAC water', weight: '3 ml', price: 4.95, catSlug: 'supplies-extras', sku: 'GP-BACW-3ML', badge: 'Compact', sequence: 'n.v.t.', cas: 'n.v.t. (steriel water + benzylalcohol, CAS 100-51-6)', storage: 'B' },
  { name: 'BAC water', weight: '10 ml', price: 9.95, catSlug: 'supplies-extras', sku: 'GP-BACW-10ML', badge: 'Essentieel', sequence: 'n.v.t.', cas: 'n.v.t. (steriel water + benzylalcohol, CAS 100-51-6)', storage: 'B' },
  
  { name: 'Acetic Acid water', weight: '10 ml', price: 9.95, catSlug: 'supplies-extras', sku: 'GP-AA-10MG', badge: 'Specialistisch', sequence: 'n.v.t.', cas: 'Azijnzuur: 64-19-7', storage: 'B' },
  
  { name: 'Genetek BAC water', weight: '10 ml', price: 7.95, catSlug: 'supplies-extras', sku: 'GP-BACW-GT-10ML', badge: 'Pharma Grade', sequence: 'n.v.t.', cas: 'n.v.t. (pharma-grade mengsel; hoofdbestanddeel benzylalcohol, CAS 100-51-6)', storage: 'B' },
  
  { name: 'Alcoholdoekjes', weight: '100 stuks', price: 8.95, catSlug: 'supplies-extras', sku: 'GP-ALCW-100', badge: 'Essentieel', sequence: 'n.v.t.', cas: 'Isopropylalcohol: 67-63-0', storage: 'C' },
  
  { name: 'Insulinespuit', weight: '0.3 ml', price: 4.95, catSlug: 'supplies-extras', sku: 'GP-SYR-0-3ML', badge: 'Essentieel', sequence: 'n.v.t. (medisch hulpmiddel)', cas: 'n.v.t. (medisch hulpmiddel)', storage: 'C' },
  { name: 'Insulinespuit', weight: '0.5 ml', price: 4.95, catSlug: 'supplies-extras', sku: 'GP-SYR-0-5ML', badge: 'Essentieel', sequence: 'n.v.t. (medisch hulpmiddel)', cas: 'n.v.t. (medisch hulpmiddel)', storage: 'C' },
  { name: 'Insulinespuit', weight: '1.0 ml', price: 4.95, catSlug: 'supplies-extras', sku: 'GP-SYR-1-0ML', badge: 'Essentieel', sequence: 'n.v.t. (medisch hulpmiddel)', cas: 'n.v.t. (medisch hulpmiddel)', storage: 'C' },
];

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  console.log("Starting catalog update...");

  // 1. Process Categories
  for (const cat of CATEGORIES) {
    const existing = await prisma.category.findUnique({ where: { slug: cat.slug } });
    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { name: cat.name }
      });
      console.log(`Updated category: ${cat.slug} -> ${cat.name}`);
    } else {
      await prisma.category.create({
        data: {
          slug: cat.slug,
          name: cat.name,
          description: '',
          translations: '{}'
        }
      });
      console.log(`Created category: ${cat.slug} -> ${cat.name}`);
    }
  }

  // Categories map for products
  const dbCats = await prisma.category.findMany();
  const catMap = new Map();
  for (const c of dbCats) catMap.set(c.slug, c.id);

  // 2. Process Products
  const storageMap: Record<string, string> = {
    'A': 'Lyofiel peptide: Ongeopend gekoeld bewaren (2-8°C), buiten licht. Na reconstitutie gekoeld bewaren en binnen 2-4 weken gebruiken.',
    'B': 'Waterig oplosmiddel: Op kamertemperatuur (15-25°C) bewaren, buiten direct zonlicht.',
    'C': 'Toebehoren (droog): Droog bewaren op kamertemperatuur, in de originele steriele verpakking tot gebruik.'
  };

  const processedSkus = new Set<string>();

  for (const p of PRODUCTS) {
    const catId = catMap.get(p.catSlug);
    if (!catId) {
      console.error(`Category not found for ${p.name}: ${p.catSlug}`);
      continue;
    }

    let storageInstruction = storageMap[p.storage] || p.storage;
    if (p.name === 'Lemon Bottle') {
      storageInstruction = 'Volgens fabrieksinstructies bewaren (doorgaans koel en donker, niet laten bevriezen) — verifieer exacte voorwaarden op de bijsluiter van de fabrikant';
    }
    if (p.name === 'NAD+') {
      storageInstruction = '[A], extra lichtgevoelig — donker bewaren is hier belangrijker dan bij peptiden';
    }
    if (p.name === '5-Amino-1MQ') {
      storageInstruction = '[C], beschermd tegen licht';
    }

    const metadata = {
      badge: p.badge,
      sequence: p.sequence,
      storage: storageInstruction,
    };

    // Find existing product by SKU
    const existing = await prisma.product.findFirst({ where: { sku: p.sku } });

    let finalSlug = existing?.slug || slugify(`${p.name}-${p.weight}`);

    if (existing) {
      // Update
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          price: p.price,
          categoryId: catId,
          name: p.name,
          casNumber: p.cas,
          // Since there is no 'badge' or 'sequence' column, we can update shortDesc or description, or just store it in SEO data?
          // Actually, let's inject it into translations JSON for now, or use existing fields.
          // Wait, 'benefits' is a JSON array. We can store it somewhere. Let's just update price, category, name, and casNumber first.
          benefits: JSON.stringify([{ icon: 'flask', label: p.badge }, { icon: 'shield', label: storageInstruction }]),
          // we can put sequence in shortDesc
          shortDesc: p.sequence.length > 255 ? p.sequence.substring(0,250)+'...' : p.sequence,
        }
      });
      console.log(`Updated product: ${p.sku} (${p.name} ${p.weight}) to €${p.price}`);
      processedSkus.add(p.sku);
    } else {
      // Try by slug if SKU not found
      const bySlug = await prisma.product.findUnique({ where: { slug: finalSlug } });
      if (bySlug) {
        await prisma.product.update({
          where: { id: bySlug.id },
          data: {
            sku: p.sku,
            price: p.price,
            categoryId: catId,
            name: p.name,
            casNumber: p.cas,
            benefits: JSON.stringify([{ icon: 'flask', label: p.badge }, { icon: 'shield', label: storageInstruction }]),
            shortDesc: p.sequence.length > 255 ? p.sequence.substring(0,250)+'...' : p.sequence,
          }
        });
        console.log(`Updated product by slug: ${finalSlug} -> SKU: ${p.sku}`);
        processedSkus.add(p.sku);
      } else {
        // Create new
        await prisma.product.create({
          data: {
            name: p.name,
            slug: finalSlug,
            sku: p.sku,
            weight: p.weight,
            price: p.price,
            purity: '>99%',
            categoryId: catId,
            casNumber: p.cas,
            isActive: true,
            isFeatured: false,
            description: p.sequence + '\n\n' + storageInstruction,
            shortDesc: p.sequence.length > 255 ? p.sequence.substring(0,250)+'...' : p.sequence,
            benefits: JSON.stringify([{ icon: 'flask', label: p.badge }, { icon: 'shield', label: storageInstruction }]),
            stock: 100,
            translations: '{}',
            seoData: '{}'
          }
        });
        console.log(`Created new product: ${p.sku} (${p.name} ${p.weight})`);
        processedSkus.add(p.sku);
      }
    }
  }

  // Deactivate all products not in this list
  const allProducts = await prisma.product.findMany();
  for (const p of allProducts) {
    if (!processedSkus.has(p.sku)) {
      await prisma.product.update({
        where: { id: p.id },
        data: { isActive: false }
      });
      console.log(`Deactivated product not in new list: ${p.sku} (${p.name})`);
    } else {
      // Ensure it is active
      await prisma.product.update({
        where: { id: p.id },
        data: { isActive: true }
      });
    }
  }
  
  console.log("Catalog update complete.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
