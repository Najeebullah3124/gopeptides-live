import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: {
      translate?: {
        TranslateElement: new (config: object, elementId: string) => void;
      };
    };
    googleTranslateElementInit?: () => void;
  }
}

export function GoogleTranslateButton() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // When opened, move the hidden widget into our dropdown so it's visible
  useEffect(() => {
    if (!open) return;
    const el = document.getElementById('google_translate_element');
    const container = document.getElementById('gt-dropdown-container');
    if (el && container && !container.contains(el)) {
      container.appendChild(el);
      el.style.display = 'block';
    }
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold text-ink-muted hover:text-ink hover:bg-surfaceAlt transition-colors border border-line"
        title="Translate page"
        aria-label="Translate this page"
      >
        <span className="text-base leading-none">🌐</span>
        <span className="hidden sm:inline">Translate</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 bg-surface border border-line rounded-lg shadow-lg p-3 min-w-[200px]"
        >
          <p className="text-xs font-semibold text-ink-muted mb-2 uppercase tracking-wide">
            Translate this page
          </p>
          <div id="gt-dropdown-container" />
          <p className="text-[10px] text-ink-muted mt-2">
            Powered by Google Translate
          </p>
        </div>
      )}
    </div>
  );
}
