interface VialProps {
  color?: string;
  size?: number;
  className?: string;
}

export function Vial({ color = '#5CC0BE', size = 140, className }: VialProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`vialBody-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1A2A3E" />
          <stop offset="100%" stopColor="#0D1A2B" />
        </linearGradient>
        <linearGradient id={`vialLiquid-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.85" />
          <stop offset="100%" stopColor={color} stopOpacity="0.4" />
        </linearGradient>
        <radialGradient id={`vialGlow-${color}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Glow */}
      <circle cx="70" cy="80" r="55" fill={`url(#vialGlow-${color})`} />

      {/* Vial cap */}
      <rect x="56" y="18" width="28" height="10" rx="2" fill="#2A3A50" />
      <rect x="58" y="24" width="24" height="6" rx="1" fill="#1A2A3E" />

      {/* Vial neck */}
      <rect x="62" y="30" width="16" height="6" fill="#0D1A2B" stroke="#2A3A50" strokeWidth="1" />

      {/* Vial body */}
      <rect
        x="50"
        y="36"
        width="40"
        height="86"
        rx="6"
        fill={`url(#vialBody-${color})`}
        stroke="#2A3A50"
        strokeWidth="1.2"
      />

      {/* Liquid */}
      <rect x="54" y="62" width="32" height="56" rx="4" fill={`url(#vialLiquid-${color})`} />

      {/* Liquid surface highlight */}
      <ellipse cx="70" cy="62" rx="16" ry="2.5" fill={color} opacity="0.55" />

      {/* Side highlight */}
      <rect x="54" y="42" width="3" height="74" rx="2" fill={color} opacity="0.18" />
      <rect x="83" y="50" width="2" height="60" rx="1" fill="#ffffff" opacity="0.06" />

      {/* Label */}
      <rect x="54" y="80" width="32" height="22" rx="2" fill="#091320" opacity="0.85" />
      <rect x="58" y="86" width="24" height="2" rx="1" fill={color} opacity="0.5" />
      <rect x="58" y="92" width="18" height="1.5" rx="0.5" fill="#8899AA" opacity="0.6" />
      <rect x="58" y="96" width="20" height="1.5" rx="0.5" fill="#8899AA" opacity="0.4" />
    </svg>
  );
}
