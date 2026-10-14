import { Link } from 'react-router-dom';
import type { SeoMeta } from '@/services/seoService';

export function SeoContentBlock({ seo }: { seo?: SeoMeta }) {
  if (!seo?.bodyContent && !seo?.internalLinks?.length && !seo?.externalLinks?.length) {
    return null;
  }

  return (
    <section className="mt-16 pt-12 border-t border-line/50 seo-content-block">
      <div className="max-w-4xl mx-auto space-y-12">

        {seo?.bodyContent && (
          <div
            className="prose prose-sm sm:prose-base prose-ink max-w-none prose-a:text-primary"
            dangerouslySetInnerHTML={{ __html: seo?.bodyContent || '' }}
          />
        )}
        
        {(!!seo?.internalLinks?.length || !!seo?.externalLinks?.length) && (
          <div className="bg-surfaceAlt/50 rounded-2xl p-6 md:p-8 space-y-6 border border-line">
            <h2 className="text-xl font-bold text-ink">Related Resources</h2>
            <div className="grid sm:grid-cols-2 gap-8">
              {!!seo?.internalLinks?.length && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-ink-muted uppercase tracking-wider">Internal Links</h3>
                  <ul className="space-y-2">
                    {seo?.internalLinks?.map((link, i) => (
                      <li key={i}>
                        <Link to={link.href} className="text-primary hover:underline font-medium">
                          {link.label || link.href}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!!seo?.externalLinks?.length && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-ink-muted uppercase tracking-wider">External References</h3>
                  <ul className="space-y-2">
                    {seo?.externalLinks?.map((link, i) => (
                      <li key={i}>
                        <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                          {link.label || link.href}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
