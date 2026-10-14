import { ReactNode, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { settingsService } from '@/services/settingsService';
import { useT } from '@/hooks/useT';
import { Logo } from './Logo';

interface MaintenanceGuardProps {
  children: ReactNode;
}

export function MaintenanceGuard({ children }: MaintenanceGuardProps) {
  const { t, lang } = useT();
  const location = useLocation();

  // Fetch settings from API
  const { data: settings } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => settingsService.get(),
    refetchInterval: 60000, // Refetch settings every minute
  });

  // Pick the correct maintenance message based on active language
  const maintenanceMessage = (() => {
    if (!settings) return t('maintenance.message');
    if (lang === 'nl') return settings.maintenanceMessageNl || settings.maintenanceMessage || t('maintenance.message');
    if (lang === 'de') return settings.maintenanceMessageDe || settings.maintenanceMessage || t('maintenance.message');
    return settings.maintenanceMessage || t('maintenance.message');
  })();

  // Check if current path matches configured pages for maintenance
  const isBlocked = (() => {
    if (!settings || !settings.maintenanceMode) return false;

    const currentPath = location.pathname.toLowerCase();
    const configuredPages = settings.maintenancePages || '';

    // Split page rules (comma-separated)
    const rules = configuredPages.split(',').map((r) => r.trim().toLowerCase());

    return rules.some((rule) => {
      if (!rule) return false;
      // Exact match or prefix match (e.g. /shop matches /shop and /shop/peptides/...)
      return currentPath === rule || currentPath.startsWith(rule + '/');
    });
  })();

  if (isBlocked) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full text-center">
            <div className="flex justify-center mb-6">
              <Logo large />
            </div>

            <div className="card p-8 bg-white border border-primary/20 shadow-xl relative overflow-hidden rounded-2xl">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-gold"></div>

              {/* Pulsing visual element */}
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-primary animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>



              <h2 className="text-xl font-bold text-ink mb-3">
                {t('maintenance.title') || 'We are back soon'}
              </h2>

              <p className="text-sm text-ink-muted leading-relaxed mb-6 font-medium">
                {maintenanceMessage}
              </p>

              {/* Nav fallback */}
              <div className="flex justify-center gap-4 text-xs font-bold text-primary pt-4 border-t border-lineSoft">
                <Link to="/" className="hover:text-primary-light transition-colors">
                  {t('nav.home') || 'Home'}
                </Link>
                <span className="text-ink-dim">•</span>
                <Link to="/labresults" className="hover:text-primary-light transition-colors">
                  {t('nav.science') || 'Science'}
                </Link>
                <span className="text-ink-dim">•</span>
                <Link to="/contact" className="hover:text-primary-light transition-colors">
                  {t('nav.contact') || 'Contact'}
                </Link>
              </div>
            </div>
          </div>
      </div>
    );
  }

  return <>{children}</>;
}
