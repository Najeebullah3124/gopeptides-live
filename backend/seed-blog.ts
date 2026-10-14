import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find or create admin user
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    console.error('No admin user found. Run the main seed first.');
    process.exit(1);
  }

  // Clear existing blog data
  await prisma.blogPost.deleteMany({});
  await prisma.blogCategory.deleteMany({});
  console.log('Cleared existing blog data');

  // Create categories
  const [research, science, guides] = await Promise.all([
    prisma.blogCategory.create({ data: { name: 'Research', slug: 'research', description: 'Latest research findings and studies' } }),
    prisma.blogCategory.create({ data: { name: 'Science', slug: 'science', description: 'Deep dives into peptide science' } }),
    prisma.blogCategory.create({ data: { name: 'Guides', slug: 'guides', description: 'Practical guides for researchers' } }),
  ]);

  const now = new Date();

  // Sample post 1 — TB-500
  await prisma.blogPost.create({
    data: {
      title: 'Overview of Thymosin Beta-4 (TB-500)',
      slug: 'overview-thymosin-beta-4-tb-500',
      featuredImage: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&q=80',
      excerpt: 'An in-depth look at Thymosin Beta-4, its role in actin polymerization, wound healing, and angiogenesis — and what researchers need to know.',
      content: `### Overview of Thymosin Beta-4

Thymosin Beta-4 (Tβ4) is a highly abundant, naturally occurring protein consisting of 43 amino acids. In research circles, the synthetic fragment representing its active domain is frequently referred to as **TB-500**. Tβ4 is found in high concentrations in blood platelets and wound fluid, serving as one of the body's primary responses to tissue injury.

### The Role of Actin Polymerization

One of the most remarkable properties of TB-500 is its role as the major G-actin sequestering peptide. By preventing G-actin from polymerizing into F-actin, it maintains a pool of actin monomers available for rapid remodeling. This directly facilitates:

* **Cell Migration**: Accelerating the movement of endothelial cells and fibroblasts to the site of an injury.
* **Dermal Wound Healing**: Boosting re-epithelialization of skin lesions.
* **Tendon Remodeling**: Improving the elasticity and recovery speed of damaged dense connective tissues.

### Angiogenic Properties

TB-500 is a potent stimulator of angiogenesis. By promoting the migration and differentiation of endothelial cells, it assists in laying down new capillary networks. This increases the supply of oxygen and essential nutrients to recovering tissues, which is highly beneficial in ischemic injury models.

### Research Implications

While TB-500 shows excellent promise in wound healing and cardiovascular models, its potent cell-migratory and angiogenic effects require careful isolation. Ongoing laboratory studies are mapping its interactions in chronic wound environments, cardiac infarction repair, and ophthalmic corneal healing.`,
      status: 'PUBLISHED',
      publishedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      categoryId: research.id,
      authorId: admin.id,
      baseLanguage: 'en',
      tags: JSON.stringify(['TB-500', 'thymosin', 'actin', 'wound healing', 'angiogenesis']),
      readTime: 5,
      seoTitle: 'Thymosin Beta-4 (TB-500): Research Overview | GoPeptides',
      seoDescription: 'Comprehensive research overview of Thymosin Beta-4 (TB-500) — actin polymerization, wound healing, and angiogenic properties.',
      translations: JSON.stringify({
        nl: {
          title: 'Overzicht van Thymosin Beta-4 (TB-500)',
          excerpt: 'Een diepgaande blik op Thymosin Beta-4, de rol ervan bij actinepolymerisatie, wondgenezing en angiogenese.',
          content: `### Overzicht van Thymosin Beta-4

Thymosin Beta-4 (Tβ4) is een overvloedig aanwezig, van nature voorkomend eiwit dat bestaat uit 43 aminozuren. In onderzoekskringen wordt het synthetische fragment dat het actieve domein vertegenwoordigt vaak aangeduid als **TB-500**. Tβ4 wordt in hoge concentraties aangetroffen in bloedplaatjes en wondvocht.

### De rol van actinepolymerisatie

Een van de meest opvallende eigenschappen van TB-500 is zijn rol als belangrijkste G-actine-sequestrerende peptide. Door te voorkomen dat G-actine polymeriseert tot F-actine, houdt het een pool van actinemonomeren beschikbaar voor snelle hermodellering. Dit faciliteert direct:

* **Celmigratie**: Versnelling van de beweging van endotheelcellen en fibroblasten naar de wondplek.
* **Wondgenezing van de huid**: Bevordering van re-epithelialisatie van huidletsels.
* **Peeshermodellering**: Verbetering van de elasticiteit en herstelsnelheid van beschadigd bindweefsel.`,
        },
      }),
    },
  });

  // Sample post 2 — BPC-157
  await prisma.blogPost.create({
    data: {
      title: 'BPC-157: Mechanisms of Gastrointestinal and Musculoskeletal Repair',
      slug: 'bpc-157-mechanisms-repair',
      excerpt: 'Body Protection Compound-157 is a synthetic pentadecapeptide derived from human gastric juice. This article examines its cytoprotective mechanisms and research applications.',
      content: `### What is BPC-157?

Body Protection Compound-157 (BPC-157) is a synthetic pentadecapeptide — a sequence of 15 amino acids — derived from a protective protein found in human gastric juice. It is **not** a naturally occurring peptide in its exact form; it is a stable gastric pentadecapeptide developed for research purposes.

### Cytoprotective Mechanisms

BPC-157 exhibits multiple cytoprotective pathways:

1. **Nitric Oxide Modulation**: It appears to upregulate eNOS (endothelial nitric oxide synthase), enhancing blood vessel integrity and local tissue perfusion.
2. **Growth Factor Interaction**: Research suggests BPC-157 interacts with VEGF (Vascular Endothelial Growth Factor) signalling pathways, supporting angiogenesis and tissue regeneration.
3. **Tendon-to-Bone Healing**: In tendon fibroblast models, BPC-157 has shown the ability to accelerate the outgrowth and attachment of tenocytes.

### Gastrointestinal Applications

BPC-157's original discovery context was gastric protection. Studies in animal models demonstrate:

* Accelerated healing of gastric ulcers
* Protection against NSAID-induced gut damage
* Reduction in inflammatory bowel pathology markers

### Current Research Landscape

BPC-157 is currently under investigation across multiple preclinical models. Its systemic stability following oral or parenteral administration makes it a compelling subject for gastrointestinal, orthopaedic, and neurological repair research.`,
      status: 'PUBLISHED',
      publishedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      categoryId: science.id,
      authorId: admin.id,
      baseLanguage: 'en',
      tags: JSON.stringify(['BPC-157', 'gastric', 'healing', 'cytoprotection', 'VEGF']),
      readTime: 6,
      seoTitle: 'BPC-157: Mechanisms of Repair Research | GoPeptides',
      seoDescription: 'Research overview of BPC-157 mechanisms — gastrointestinal protection, tendon repair, and VEGF signalling pathways.',
      translations: JSON.stringify({}),
    },
  });

  // Sample post 3 — Storage Guide
  await prisma.blogPost.create({
    data: {
      title: 'Peptide Storage & Reconstitution: A Researcher\'s Practical Guide',
      slug: 'peptide-storage-reconstitution-guide',
      excerpt: 'Correct storage and reconstitution are critical for maintaining peptide integrity. This guide covers best practices for lyophilized and reconstituted peptides.',
      content: `### Why Storage Matters

Peptides are sensitive molecules. Improper storage leads to degradation, oxidation, and loss of biological activity — making your research results unreliable. This guide covers the essential steps every researcher should follow.

### Lyophilized Peptides (Dry Powder)

All GoPeptides products ship in lyophilized form — freeze-dried into a stable powder. Proper storage:

| Condition | Duration |
|-----------|----------|
| -20°C (freezer) | Indefinitely |
| +4°C (fridge) | Up to 3 months |
| Room temperature | Avoid — not recommended |

**Key rules:**
* Allow the vial to reach room temperature **before opening** to prevent moisture condensation
* Do **not** expose to repeated freeze-thaw cycles
* Keep away from direct light — most peptides are light-sensitive

### Reconstitution Step-by-Step

1. **Choose your solvent**: Bacteriostatic water (BW) is recommended for most peptides. For hydrophobic peptides, add a small amount of acetic acid or DMSO first, then dilute with BW.
2. **Inject solvent slowly** along the vial wall — do not spray directly onto the powder
3. **Gently swirl** — never shake or vortex aggressively
4. **Allow to dissolve** at room temperature for 5–10 minutes

### Reconstituted Peptide Storage

Once dissolved, stability decreases significantly:

* Store at **2–8°C** in the refrigerator
* Use within **14–30 days** (varies by peptide — see individual product pages)
* Use sterile syringes and needles to avoid contamination

### Concentration Calculations

For a **1 mg vial** reconstituted to **1 mL** = **1 mg/mL** (1000 mcg/mL).

For a **200 mcg dose** from a 1 mg/mL solution: draw **0.2 mL** (20 units on a 100-unit insulin syringe).

### Common Mistakes to Avoid

* **Reconstituting too early** — only reconstitute what you need
* **Using tap water** — always use bacteriostatic or sterile water
* **Skipping the warm-up** — cold peptide powder doesn't dissolve evenly`,
      status: 'PUBLISHED',
      publishedAt: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
      categoryId: guides.id,
      authorId: admin.id,
      baseLanguage: 'en',
      tags: JSON.stringify(['storage', 'reconstitution', 'guide', 'bacteriostatic water', 'lyophilized']),
      readTime: 7,
      seoTitle: 'Peptide Storage & Reconstitution Guide | GoPeptides',
      seoDescription: 'Step-by-step guide to storing and reconstituting research peptides — from lyophilized powder to ready-to-use solution.',
      translations: JSON.stringify({
        nl: {
          title: 'Peptide opslag & reconstitutie: een praktische gids voor onderzoekers',
          excerpt: 'Correcte opslag en reconstitutie zijn essentieel voor het behoud van peptide-integriteit. Deze gids behandelt best practices voor gelyofiliseerde en gereconstitueerde peptides.',
          content: `### Waarom opslag belangrijk is

Peptides zijn gevoelige moleculen. Onjuiste opslag leidt tot afbraak, oxidatie en verlies van biologische activiteit — waardoor uw onderzoeksresultaten onbetrouwbaar worden.

### Gelyofiliseerde peptides (droog poeder)

Alle GoPeptides-producten worden verzonden in gelyofiliseerde vorm. Juiste opslag:

* **-20°C (vriezer)**: Onbeperkt
* **+4°C (koelkast)**: Tot 3 maanden
* **Kamertemperatuur**: Vermijden

**Belangrijke regels:**
* Laat de vial op kamertemperatuur komen **voordat u hem opent**
* Vermijd herhaalde vries-dooi-cycli
* Bewaar uit direct licht

### Reconstitutie stap voor stap

1. Kies uw oplosmiddel: bacteriostatisch water wordt aanbevolen
2. Injecteer het oplosmiddel langzaam langs de vialwand
3. Zachtjes zwenken — nooit krachtig schudden
4. Laat 5–10 minuten oplossen op kamertemperatuur`,
        },
      }),
    },
  });

  const total = await prisma.blogPost.count();
  console.log(`✓ Seeded ${total} blog posts in 3 categories`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
