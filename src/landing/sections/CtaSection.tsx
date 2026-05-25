import { useNavigate } from 'react-router-dom';
import { CONTENT } from '../config/content';

export const CtaSection = () => {
  const navigate = useNavigate();
  const c = CONTENT.cta;

  return (
    <section className="w-full bg-primary px-6 py-24">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 text-center">
        <h2 className="type-page-title font-extrabold text-primary-foreground max-w-lg leading-snug">
          {c.headline}
        </h2>
        <p className="type-body text-primary-foreground/80 max-w-sm">{c.sub}</p>
        <button
          onClick={() => navigate('/login')}
          className="mt-2 rounded-2xl bg-white px-8 py-4 type-body-strong font-semibold text-primary shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition-all hover:bg-primary-50 active:scale-[0.98]"
        >
          {c.button}
        </button>
      </div>
    </section>
  );
};
