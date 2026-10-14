import { useLangStore } from '@/stores/langStore';

export function useTranslatedProduct<T extends { name: string; shortDesc: string; description: string; translations?: string }>(product: T) {
  const lang = useLangStore((s) => s.lang);

  let manualName = '';
  let manualShortDesc = '';
  let manualDescription = '';

  if (product.translations) {
    try {
      const parsed = JSON.parse(product.translations);
      const trans = parsed[lang];
      if (trans) {
        if (trans.name) manualName = trans.name;
        if (trans.shortDesc) manualShortDesc = trans.shortDesc;
        if (trans.description) manualDescription = trans.description;
      }
    } catch {
      // ignore
    }
  }

  // ponytail: /api/products?lang= already returns resolveProductLang() — client /translate was 30+ duplicate calls
  let finalName = manualName || product.name;
  if ((lang === 'de' || lang === 'nl') && !manualName) {
    finalName = finalName
      .replace(/Tirzepatide/gi, 'Tirzepatid')
      .replace(/Retatrutide/gi, 'Retatrutid')
      .replace(/Semaglutide/gi, 'Semaglutid')
      .replace(/Liraglutide/gi, 'Liraglutid');
  }

  return {
    name: finalName,
    shortDesc: manualShortDesc || product.shortDesc,
    description: manualDescription || product.description,
  };
}
