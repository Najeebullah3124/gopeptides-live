import { useState } from 'react';
import type { FAQPage, WithContext } from 'schema-dts';
import { JsonLd } from '@/components/seo/JsonLd';
import { cn } from '@/utils/helpers';

type FaqItem = { question: string; answer: string };

/** Compact FAQ list + FAQPage JSON-LD for AEO extraction. */
export function AeoFaqList({
  items,
  title,
}: {
  items: FaqItem[];
  title: string;
}) {
  const [open, setOpen] = useState<number | null>(0);
  if (!items.length) return null;

  const faqJsonLd: WithContext<FAQPage> = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  return (
    <section className="mt-8 mb-2" data-aeo="faq">
      <JsonLd data={faqJsonLd} />
      <h2 className="text-lg font-bold text-ink mb-3">{title}</h2>
      <div className="space-y-2">
        {items.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={item.question}
              className={cn('faq-row cursor-pointer', isOpen && 'border-primary/40')}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-ink">{item.question}</h3>
                <span className={cn('text-primary text-lg leading-none', isOpen && 'rotate-45')}>+</span>
              </div>
              {isOpen && <p className="text-sm text-ink-muted leading-relaxed pt-2">{item.answer}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
