// OzoLoader.tsx — OZO Calendar 로딩 애니메이션 (React 18+)
// Source: OzoLoader.jsx (Claude Design) — converted to TypeScript

import { useEffect, useState, useMemo } from 'react';

const HOUSE_BODY = {
  trCorn: [164, 92]  as [number, number],
  brCorn: [164, 168] as [number, number],
  blCorn: [36,  168] as [number, number],
  tlCorn: [36,  92]  as [number, number],
};

function makeHousePoly(peakY: number): [number, number][] {
  return [
    [100, peakY],
    HOUSE_BODY.trCorn,
    HOUSE_BODY.brCorn,
    HOUSE_BODY.blCorn,
    HOUSE_BODY.tlCorn,
    [100, peakY],
  ];
}

function makeCum(poly: [number, number][]): number[] {
  const cum = [0];
  for (let i = 1; i < poly.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(
      poly[i][0] - poly[i - 1][0],
      poly[i][1] - poly[i - 1][1],
    ));
  }
  return cum;
}

function polyAt(poly: [number, number][], cum: number[], d: number): [number, number] {
  for (let i = 1; i < cum.length; i++) {
    if (d <= cum[i] + 1e-6) {
      const span = cum[i] - cum[i - 1];
      const t = span === 0 ? 0 : (d - cum[i - 1]) / span;
      return [
        poly[i - 1][0] + t * (poly[i][0] - poly[i - 1][0]),
        poly[i - 1][1] + t * (poly[i][1] - poly[i - 1][1]),
      ];
    }
  }
  return poly[poly.length - 1];
}

function polyPathBetween(
  poly: [number, number][],
  cum: number[],
  startD: number,
  endD: number,
): string {
  const pts: [number, number][] = [polyAt(poly, cum, startD)];
  for (let i = 1; i < cum.length - 1; i++) {
    if (cum[i] > startD + 1e-3 && cum[i] < endD - 1e-3) pts.push(poly[i]);
  }
  pts.push(polyAt(poly, cum, endD));
  return 'M ' + pts.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' L ');
}

const DEFAULT_PALETTE = ['#10B981', '#2563EB', '#E11D48', '#A78BFA'];
const easeInOutQuad = (x: number) =>
  x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

function useLoopTime({ drawMs = 1800, holdMs = 700 }: { drawMs?: number; holdMs?: number }) {
  const [phase, setPhase] = useState({ t: 0, settled: false });
  useEffect(() => {
    let raf: number;
    const cycle = drawMs + holdMs;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - start) % cycle;
      setPhase({ t: Math.min(1, elapsed / drawMs), settled: elapsed >= drawMs });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [drawMs, holdMs]);
  return phase;
}

export interface OzoLoaderProps {
  size?:        number;
  peakY?:       number;
  strokeWidth?: number;
  shares?:      number[];
  palette?:     string[];
  showNumeral?: boolean;
  numeral?:     string;
  numColor?:    string;
  numSize?:     number;
  numCy?:       number;
  drawMs?:      number;
  holdMs?:      number;
  background?:  string;
  radius?:      number;
  countUp?:     boolean;
  countFrom?:   number;
  countTo?:     number;
  ease?:        (x: number) => number;
}

export function OzoLoader({
  size        = 220,
  peakY       = 47,
  strokeWidth = 23,
  shares      = [0.50, 0.25, 0.19, 0.06],
  palette     = DEFAULT_PALETTE,
  showNumeral = true,
  numeral     = '31',
  numColor    = '#2563EB',
  numSize     = 65,
  numCy       = 119,
  drawMs      = 1800,
  holdMs      = 700,
  background  = 'transparent',
  radius      = 0,
  countUp     = false,
  countFrom   = 1,
  countTo,
  ease        = easeInOutQuad,
}: OzoLoaderProps) {
  const { t, settled } = useLoopTime({ drawMs, holdMs });
  const poly      = useMemo(() => makeHousePoly(peakY), [peakY]);
  const cum       = useMemo(() => makeCum(poly), [poly]);
  const perimeter = cum[cum.length - 1];

  let cumulative = 0;
  const segs = shares.map((s, i) => {
    const segStartT = cumulative;
    cumulative += s;
    const localT = Math.max(0, Math.min(1, (t - segStartT) / Math.max(s, 1e-4)));
    const pStart  = segStartT * perimeter;
    const pEnd    = pStart + s * ease(localT) * perimeter;
    if (pEnd - pStart < 0.5) return null;
    return (
      <path
        key={i}
        d={polyPathBetween(poly, cum, pStart, pEnd)}
        fill="none"
        stroke={palette[i] ?? '#000'}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  });

  let displayNumeral = numeral;
  let numOpacity: number;
  let numTranslate: number;

  if (countUp) {
    const finalN = countTo ?? (parseInt(String(numeral), 10) || 31);
    displayNumeral = String(
      settled
        ? finalN
        : Math.max(countFrom, Math.min(finalN, countFrom + Math.floor(t * (finalN - countFrom + 1)))),
    );
    numOpacity  = 1;
    numTranslate = 0;
  } else {
    numOpacity   = settled ? 1 : Math.max(0, Math.min(1, (t - 0.75) / 0.25));
    numTranslate = (1 - numOpacity) * 8;
  }

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" style={{ display: 'block' }}>
      {background && background !== 'transparent' && (
        <rect x="0" y="0" width="200" height="200" rx={radius} ry={radius} fill={background} />
      )}
      {segs}
      {showNumeral && numeral && (
        <g style={{ opacity: numOpacity, transform: `translateY(${numTranslate}px)` }}>
          <text
            x="100"
            y={numCy}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily='"Pretendard", system-ui, sans-serif'
            fontWeight={800}
            fontSize={numSize}
            letterSpacing={-3.5}
            fill={numColor}
            style={{ fontFeatureSettings: '"tnum" 1' }}
          >
            {displayNumeral}
          </text>
        </g>
      )}
    </svg>
  );
}

export default OzoLoader;
