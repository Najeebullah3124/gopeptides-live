/**
 * Verify save styles → preview → generate workflow for one label variant.
 * Run: npx tsx scripts/verifyLabelWorkflow.ts
 */
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { prisma } from '../src/config/database';

const API = process.env.LOCAL_API_URL || 'http://127.0.0.1:3001/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gopeptides.nl';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

const DEFAULT_FONTS = {
  frontProductName: 'Montserrat',
  frontDosage: 'Montserrat',
  frontDisclaimer: 'Montserrat',
  backHeaderPrefix: 'Montserrat',
  backHeaderNameDosage: 'Montserrat',
  backFieldLabels: 'Montserrat',
  backFieldValues: 'Montserrat',
};

async function main(): Promise<void> {
  const login = await axios.post(`${API}/auth/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  const token = login.data.data.accessToken as string;
  const headers = { Authorization: `Bearer ${token}` };

  const variants = await axios.get(`${API}/admin/labels/variants`, { headers });
  const list = variants.data.data as Array<{ id: string; product: { name: string }; dosage: string }>;
  if (!list.length) throw new Error('No label variants in database');
  const variant = list[0];
  console.log(`Using variant: ${variant.product.name} ${variant.dosage} (${variant.id})`);

  const fontOverrides = {
    ...DEFAULT_FONTS,
    frontProductName: 'Playfair Display',
    frontDosage: 'Montserrat',
  };

  const saved = await axios.patch(
    `${API}/admin/labels/variants/${variant.id}`,
    { fontOverrides, colorOverrides: { frontProductName: '#008080' } },
    { headers }
  );
  const savedVariant = saved.data.data as { fontOverrides?: Record<string, string> };
  console.log('Saved fontOverrides:', JSON.stringify(savedVariant?.fontOverrides));

  let preview: { data: ArrayBuffer };
  try {
    preview = await axios.post(
      `${API}/admin/labels/preview`,
      { variantId: variant.id, fontOverrides, language: 'nl' },
      { headers, responseType: 'arraybuffer' }
    );
  } catch (err: unknown) {
    const ax = err as { response?: { status?: number; data?: Buffer } };
    const body = ax.response?.data ? Buffer.from(ax.response.data).toString('utf8') : '';
    throw new Error(`Preview failed (${ax.response?.status}): ${body}`);
  }
  const previewPath = path.join(process.cwd(), 'verify-preview.png');
  fs.writeFileSync(previewPath, Buffer.from(preview.data));
  console.log(`Preview PNG: ${previewPath} (${preview.data.byteLength} bytes)`);

  const generated = await axios.post(
    `${API}/admin/labels/generate`,
    { variantIds: [variant.id], formats: ['png'], language: 'nl' },
    { headers }
  );
  const assets = generated.data.data[0]?.assets as Array<{ fileName: string; fileUrl: string }>;
  const png = assets?.find((a) => a.fileName.endsWith('.png'));
  console.log('Generated:', png?.fileName, png?.fileUrl);

  const row = await prisma.labelVariant.findUnique({
    where: { id: variant.id },
    select: { fontOverrides: true },
  });
  console.log('DB fontOverrides:', row?.fontOverrides);

  const dbOk = row?.fontOverrides?.includes('Playfair Display');
  const previewOk = preview.data.byteLength > 40000;
  console.log(dbOk ? 'PASS: fonts saved in DB' : 'FAIL: fonts not in DB');
  console.log(previewOk ? 'PASS: preview PNG rendered' : 'FAIL: preview too small (font issue?)');
}

main()
  .catch((err) => {
    console.error(err.response?.data || err.message || err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
