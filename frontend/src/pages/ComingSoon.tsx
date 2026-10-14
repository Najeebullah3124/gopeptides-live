import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useT } from '@/hooks/useT';

interface ComingSoonProps {
  title: string;
  description?: string;
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
  const { t } = useT();
  return (
    <div className="container-app py-24 text-center" style={{ padding: 'clamp(48px, 8vw, 96px) clamp(16px, 5vw, 40px)' }}>
      <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 mx-auto flex items-center justify-center mb-6">
        <Icon name="spark" size={26} className="text-primary" />
      </div>
      <h1 className="text-3xl font-extrabold text-ink mb-3">{title}</h1>
      <p className="text-ink-muted max-w-md mx-auto mb-8">{description || t('comingSoon.default')}</p>
      <div className="flex gap-3 justify-center flex-wrap">
        <Link to="/" className="btn-out">
          {t('comingSoon.home')}
        </Link>
        <Link to="/shop" className="btn-cta">
          {t('comingSoon.browse')}
        </Link>
      </div>
    </div>
  );
}
