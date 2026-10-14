import { Link } from 'react-router-dom';
import { Icon } from './Icon';

export interface Crumb {
  label: string;
  to?: string;
}

interface BreadcrumbProps {
  items: Crumb[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav
      className="flex items-center gap-2 text-xs text-ink-muted overflow-x-auto whitespace-nowrap py-1 w-full px-2 sm:px-0"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      aria-label="Breadcrumb"
    >
      <style dangerouslySetInnerHTML={{__html: `
        nav[aria-label="Breadcrumb"]::-webkit-scrollbar {
          display: none;
        }
      `}} />
      {items.map((c, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-2 flex-shrink-0">
            {c.to && !isLast ? (
              <Link to={c.to} className="hover:text-primary transition-colors">
                {c.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-ink font-medium' : ''}>{c.label}</span>
            )}
            {!isLast && <Icon name="chevronDown" size={12} className="-rotate-90 text-ink-dim flex-shrink-0" />}
          </span>
        );
      })}
    </nav>
  );
}
