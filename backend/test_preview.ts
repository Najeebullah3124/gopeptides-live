import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

async function test() {
  try {
    const variant = await prisma.labelVariant.findFirst();
    if (!variant) return console.log('No variant');

    const res = await fetch('http://localhost:3000/api/admin/labels/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        variantId: variant.id,
        layout: 'tiff',
        fullBackground: true
      })
    });
    console.log(res.status, await res.text());
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
