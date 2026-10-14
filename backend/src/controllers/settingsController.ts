import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { z } from 'zod';

const updateSettingsSchema = z.object({
  contact: z.any().optional(),
  social: z.any().optional(),
  analytics: z.any().optional(),
});

export const getSettings = async (req: Request, res: Response) => {
  try {
    const contactSetting = await prisma.systemSetting.findUnique({
      where: { key: 'site.contact' }
    });

    const socialSetting = await prisma.systemSetting.findUnique({
      where: { key: 'site.social' }
    });
    const seoSetting = await prisma.systemSetting.findUnique({
      where: { key: 'SEO_PAGE_META' }
    });
    const analyticsSetting = await prisma.systemSetting.findUnique({
      where: { key: 'site.analytics' }
    });

    let contact = {};
    let social = {};
    let seo = {};
    let analytics = {};

    try { if (contactSetting?.value) contact = JSON.parse(contactSetting.value); } catch {}
    try { if (socialSetting?.value) social = JSON.parse(socialSetting.value); } catch {}
    try { if (seoSetting?.value) seo = JSON.parse(seoSetting.value); } catch {}
    try { if (analyticsSetting?.value) analytics = JSON.parse(analyticsSetting.value); } catch {}

    res.json({
      success: true,
      data: {
        contact,
        social,
        seo,
        analytics
      }
    });
  } catch (error) {
    console.error('[settingsController] getSettings error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const parsed = updateSettingsSchema.parse(req.body);

    const promises = [];

    if (parsed.contact !== undefined) {
      promises.push(
        prisma.systemSetting.upsert({
          where: { key: 'site.contact' },
          update: { value: JSON.stringify(parsed.contact) },
          create: { key: 'site.contact', value: JSON.stringify(parsed.contact) }
        })
      );
    }

    if (parsed.social !== undefined) {
      promises.push(
        prisma.systemSetting.upsert({
          where: { key: 'site.social' },
          update: { value: JSON.stringify(parsed.social) },
          create: { key: 'site.social', value: JSON.stringify(parsed.social) }
        })
      );
    }

    if (parsed.analytics !== undefined) {
      promises.push(
        prisma.systemSetting.upsert({
          where: { key: 'site.analytics' },
          update: { value: JSON.stringify(parsed.analytics) },
          create: { key: 'site.analytics', value: JSON.stringify(parsed.analytics) }
        })
      );
    }

    await Promise.all(promises);

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
    }
    console.error('[settingsController] updateSettings error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
