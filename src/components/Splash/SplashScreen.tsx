import { useEffect, useState, useRef } from 'react';
import { OzoLoader } from './OzoLoader';

interface Props {
  onDone: () => void;
}

const DRAW_MS = 1400;
const HOLD_MS =  400;
const FADE_MS =  350;

export const SplashScreen = ({ onDone }: Props) => {
  const [fadeOut, setFadeOut] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), DRAW_MS + HOLD_MS);
    const doneTimer = setTimeout(() => onDoneRef.current(), DRAW_MS + HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
      style={{ transition: `opacity ${FADE_MS}ms ease`, opacity: fadeOut ? 0 : 1 }}
    >
      <OzoLoader
        size={200}
        drawMs={DRAW_MS}
        holdMs={99999}
        countUp
        countFrom={1}
        countTo={31}
      />
      <p
        className="font-semibold text-muted-foreground select-none uppercase"
        style={{ fontSize: 11, letterSpacing: '0.22em', marginTop: -4 }}
      >
        OZO Calendar
      </p>
    </div>
  );
};
