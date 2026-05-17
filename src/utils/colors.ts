/**
 * Nationality color system.
 * Fixed colors per country → consistent across charts and filters.
 * Unknown countries fall back to a visually distinct palette, assigned
 * on first encounter so the same country always gets the same color.
 */
const NATIONALITY_COLOR_MAP: Record<string, string> = {
  Korea:     'var(--channel-naver)',    /* emerald */
  Taiwan:    '#f59e0b',                 /* amber */
  China:     '#ef4444',                 /* red */
  Japan:     '#ec4899',                 /* pink */
  USA:       '#3b82f6',                 /* blue-500 */
  Thailand:  '#a855f7',                 /* purple */
  Singapore: '#06b6d4',                 /* cyan */
  Vietnam:   '#84cc16',                 /* lime */
  Australia: '#f97316',                 /* orange */
  UK:        '#8b5cf6',                 /* violet */
  France:    '#e11d48',                 /* rose */
  Germany:   '#6366f1',                 /* indigo */
  Others:    'var(--muted-foreground)', /* gray */
  Unknown:   'var(--muted-foreground)',
};

const NAT_FALLBACK_PALETTE = [
  '#14b8a6', '#fb923c', '#a3e635', '#e879f9',
  '#38bdf8', '#fb7185', '#4ade80', '#fbbf24',
];

const _natSeen: Record<string, string> = {};
let _natFallbackIdx = 0;

export function getNatColor(nationality: string): string {
  const mapped = NATIONALITY_COLOR_MAP[nationality];
  if (mapped) return mapped;
  if (_natSeen[nationality]) return _natSeen[nationality];
  _natSeen[nationality] = NAT_FALLBACK_PALETTE[_natFallbackIdx % NAT_FALLBACK_PALETTE.length];
  _natFallbackIdx++;
  return _natSeen[nationality];
}
