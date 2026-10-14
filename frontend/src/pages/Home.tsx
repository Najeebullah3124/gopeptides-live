import { lazy, Suspense } from 'react';
import { Hero } from '@/components/home/Hero';
import { TrustBadges } from '@/components/home/TrustBadges';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { useT } from '@/hooks/useT';
import { useSEO } from '@/hooks/useSEO';
import { usePageSeo } from '@/hooks/usePageSeo';
import { JsonLd } from '@/components/seo/JsonLd';

const WhyUs = lazy(() => import('@/components/home/WhyUs').then((m) => ({ default: m.WhyUs })));
const ReviewsCarousel = lazy(() => import('@/components/home/ReviewsCarousel').then((m) => ({ default: m.ReviewsCarousel })));
const QualityPromise = lazy(() => import('@/components/home/QualityPromise').then((m) => ({ default: m.QualityPromise })));
const SubscribeSection = lazy(() => import('@/components/home/SubscribeSection').then((m) => ({ default: m.SubscribeSection })));
const SeoContentBlock = lazy(() => import('@/components/seo/SeoContentBlock').then((m) => ({ default: m.SeoContentBlock })));

export default function HomePage() {
  const { lang } = useT();
  const pageSeo = usePageSeo('/');
  const seo = lang === 'en'
    ? {
      title: 'HPLC-Tested Research Peptides Online in Europe',
      description: 'Explore HPLC-tested research peptides with batch-specific Certificates of Analysis from GoPeptides. Fast, reliable shipping across Europe.',
    }
    : lang === 'de'
      ? {
        title: 'HPLC-geprufte Forschungspeptide Online in Europa',
        description: 'Entdecken Sie HPLC-geprufte Forschungspeptide mit chargenspezifischem Analysezertifikat und schnellem Versand in ganz Europa.',
      }
      : {
        title: 'HPLC-geteste Onderzoekspeptiden Online in Europa',
        description: 'Ontdek HPLC-geteste onderzoekspeptiden met batchgebonden Certificate of Analysis. Bestel bij GoPeptides met snelle verzending door heel Europa.',
      };
  useSEO({
    title: pageSeo.editable?.title || seo.title,
    description: pageSeo.editable?.description || seo.description,
    keywords: pageSeo.editable?.focusKeywords,
    canonical: pageSeo.canonical,
    alternates: pageSeo.alternates,
  });

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'GoPeptides',
    url: pageSeo.canonical,
    logo: `${window.location.origin}/logo.jpeg`,
    email: 'info@gopeptides.nl',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Amsterdam',
      addressCountry: 'NL',
    },
    sameAs: [
      'https://www.instagram.com/gopeptides',
      'https://www.tiktok.com/@gopeptides',
    ],
  };

  return (
    <>
      <JsonLd data={orgJsonLd} />
      <Hero h1={pageSeo.editable?.h1} />
      <TrustBadges />
      <FeaturedProducts h2={pageSeo.editable?.h2?.[0]} />
      <Suspense fallback={null}>
        <WhyUs h2={pageSeo.editable?.h2?.[1]} />
      </Suspense>

      <Suspense fallback={null}>
        <ReviewsCarousel h2={pageSeo.editable?.h2?.[3]} />
        <QualityPromise h2s={[pageSeo.editable?.h2?.[4], pageSeo.editable?.h2?.[5]]} />
        <SubscribeSection h2={pageSeo.editable?.h2?.[6]} />
        <SeoContentBlock seo={pageSeo.editable} />
      </Suspense>
    </>
  );
}
