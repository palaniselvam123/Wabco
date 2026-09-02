/**
 * ZF roundel — circular ring enclosing the ZF monogram.
 * `color` drives both the ring and the letterforms so the mark can sit on
 * light tiles (brand blue) or dark surfaces (white).
 */
export default function ZFLogo({ size = 32, color = '#1F5FAE', title = 'ZF' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={title}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <title>{title}</title>
      <circle cx="60" cy="60" r="50" fill="none" stroke={color} strokeWidth="9.5" />
      {/* Z */}
      <path
        fill={color}
        d="M27 41 H59 V51.5 L41.5 68.5 H59 V79 H27 V68.5 L44.5 51.5 H27 Z"
      />
      {/* F */}
      <path
        fill={color}
        d="M65 41 H92 V51.5 H75.5 V57.5 H89 V68 H75.5 V79 H65 Z"
      />
    </svg>
  );
}
