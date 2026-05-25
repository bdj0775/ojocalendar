import { CONTENT } from '../config/content';

export const FooterSection = () => {
  const f = CONTENT.footer;

  return (
    <footer className="w-full border-t border-border bg-card px-6 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">

        {/* 브랜드 */}
        <div className="flex flex-col gap-2 items-center sm:items-start">
          <div className="flex items-center gap-2">
            <img src="/logo-mark.png" alt="OZO Calendar" className="h-7 w-7" />
            <span className="type-body-strong font-extrabold text-foreground">
              {f.brand}
              <span className="font-light text-muted-foreground"> {f.brandSub}</span>
            </span>
          </div>
          <p className="type-body text-muted-foreground">{f.tagline}</p>
        </div>

        {/* 링크·연락처 */}
        <div className="flex flex-col items-center gap-2 sm:items-end">
          <a
            href={`mailto:${f.contact}`}
            className="type-body text-muted-foreground hover:text-foreground transition-colors"
          >
            {f.contact}
          </a>
          <div className="flex gap-4">
            {f.links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="type-label text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 w-full max-w-6xl border-t border-border pt-6 text-center">
        <p className="type-caption text-muted-foreground">{f.copyright}</p>
      </div>
    </footer>
  );
};
