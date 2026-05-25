import { useEffect, useState, useRef } from 'react';

interface Props {
  onDone: () => void;
}

// Timing constants (ms)
const STROKE_MS  = 1400; // stroke draw duration
const COUNTER_MS = 1100; // 1→31 counter duration
const HOLD_MS    =  400; // hold after complete
const FADE_MS    =  350; // fade out duration

// House SVG path segments — 4 coloured strokes forming a pentagon house
// viewBox 0 0 100 100, strokeWidth 10, rounded caps/joins
// Junction points split each slope at its midpoint
const SEGMENTS = [
  // Purple — top cap: right-mid → apex → left-mid
  { d: 'M 66.5,29 L 50,14 L 33.5,29', color: '#9B5CF6' },
  // Green — right: right-mid → shoulder → bottom-right
  { d: 'M 66.5,29 L 83,44 L 83,83',   color: '#22C55E' },
  // Blue — floor: bottom-right → bottom-left
  { d: 'M 83,83 L 17,83',             color: '#3B82F6' },
  // Red — left: bottom-left → shoulder → left-mid
  { d: 'M 17,83 L 17,44 L 33.5,29',   color: '#EF4444' },
] as const;

export const SplashScreen = ({ onDone }: Props) => {
  const [count, setCount]     = useState(1);
  const [fadeOut, setFadeOut] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const start = performance.now();
    let raf: number;

    // Ease-out counter: fast at start, slows down near 31
    const tick = (now: number) => {
      const t      = Math.min((now - start) / COUNTER_MS, 1);
      const eased  = 1 - (1 - t) ** 2;
      setCount(Math.round(1 + eased * 30));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const fadeTimer = setTimeout(() => setFadeOut(true), STROKE_MS + HOLD_MS);
    const doneTimer = setTimeout(() => onDoneRef.current(), STROKE_MS + HOLD_MS + FADE_MS);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
      style={{ transition: `opacity ${FADE_MS}ms ease`, opacity: fadeOut ? 0 : 1 }}
    >
      {/* Logo + counter */}
      <div className="relative flex items-center justify-center" style={{ width: 124, height: 124 }}>
        <svg
          viewBox="0 0 100 100"
          width={124}
          height={124}
          fill="none"
          style={{ position: 'absolute', inset: 0 }}
          aria-hidden
        >
          {SEGMENTS.map(({ d, color }, i) => (
            <path
              key={i}
              d={d}
              stroke={color}
              strokeWidth={10}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={100}
              strokeDasharray="100"
              strokeDashoffset="100"
              style={{
                animation: `ozoDraw ${STROKE_MS}ms cubic-bezier(.4,0,.2,1) forwards`,
              }}
            />
          ))}
        </svg>

        {/* Number — key triggers remount for each value → fade-in per digit */}
        <span
          key={count}
          className="relative z-10 font-black select-none tabular-nums"
          style={{
            fontSize: 40,
            color: '#2563EB',
            animation: 'ozoCountFade 55ms ease-out forwards',
          }}
        >
          {count}
        </span>
      </div>

      {/* Brand name */}
      <p
        className="mt-4 font-semibold text-muted-foreground select-none uppercase"
        style={{ fontSize: 11, letterSpacing: '0.22em' }}
      >
        OZO Calendar
      </p>
    </div>
  );
};
