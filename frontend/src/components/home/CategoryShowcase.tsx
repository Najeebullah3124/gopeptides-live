import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useT } from '@/hooks/useT';

const categories = [
  {
    slug: 'recovery',
    title: 'Recovery',
    desc: 'Tissue repair, gut health, angiogenesis research',
    icon: 'spark' as const,
    color: 'from-primary/20 to-primary/0',
  },
  {
    slug: 'anti-aging',
    title: 'Anti-Aging',
    desc: 'Telomere, longevity, cellular health',
    icon: 'flask' as const,
    color: 'from-primary-light/20 to-primary/0',
  },
  {
    slug: 'cognitive',
    title: 'Cognitive',
    desc: 'BDNF, neuroprotection, nootropic studies',
    icon: 'beaker' as const,
    color: 'from-primary-dark/30 to-primary/0',
  },
];

export function CategoryShowcase() {
  const { t } = useT();

  return (
    <section className="container-app py-16">
      <div className="text-center mb-10">
        <p className="text-[11px] font-bold uppercase tracking-[2px] text-primary mb-2">Browse by research area</p>
        <h2 className="text-3xl lg:text-4xl font-extrabold text-ink">Three core categories</h2>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {categories.map((c) => (
          <Link
            key={c.slug}
            to={`/shop/${c.slug}`}
            className="card-hover group p-7 relative overflow-hidden"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${c.color} opacity-50 group-hover:opacity-80 transition-opacity`} />
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-4">
                <Icon name={c.icon} size={20} className="text-primary" />
              </div>
              <h3 className="text-xl font-bold text-ink mb-2">{t('category.' + c.slug)}</h3>
              <p className="text-sm text-ink-muted leading-relaxed mb-6">{t('category.' + c.slug + '.desc')}</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5 transition-all">
                Explore
                <Icon name="arrowRight" size={14} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

