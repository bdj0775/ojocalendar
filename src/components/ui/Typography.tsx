import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

/* ────────────────────────────────────────────────────────────
   타입 스케일 토큰 → src/styles/tokens/typography.css
   여기서는 토큰 이름만 참조.
   ──────────────────────────────────────────────────────────── */

export type TypographyVariant =
  | 'display'
  | 'page-title'
  | 'section-title'
  | 'card-title'
  | 'body'
  | 'body-strong'
  | 'label'
  | 'caption';

const VARIANT_CLASS: Record<TypographyVariant, string> = {
  'display':       'type-display',
  'page-title':    'type-page-title',
  'section-title': 'type-section-title',
  'card-title':    'type-card-title',
  'body':          'type-body',
  'body-strong':   'type-body-strong',
  'label':         'type-label',
  'caption':       'type-caption',
};

/* variant별 기본 HTML 태그 — as prop으로 언제든 오버라이드 가능 */
const DEFAULT_TAG: Record<TypographyVariant, ElementType> = {
  'display':       'p',
  'page-title':    'h1',
  'section-title': 'h2',
  'card-title':    'h3',
  'body':          'p',
  'body-strong':   'p',
  'label':         'span',
  'caption':       'span',
};

/* ────────────────────────────────────────────────────────────
   Base component
   ──────────────────────────────────────────────────────────── */

export interface TypographyProps extends HTMLAttributes<HTMLElement> {
  variant: TypographyVariant;
  /** 렌더링할 HTML 태그를 오버라이드. 예: as="label", as="li" */
  as?: ElementType;
  children?: ReactNode;
}

export const Typography = ({
  variant,
  as,
  className,
  children,
  ...props
}: TypographyProps) => {
  const Tag = as ?? DEFAULT_TAG[variant];
  return (
    <Tag className={cn(VARIANT_CLASS[variant], className)} {...props}>
      {children}
    </Tag>
  );
};

/* ────────────────────────────────────────────────────────────
   Shorthand exports — JSX에서 바로 사용하는 1차 API

   사용 예:
     <PageTitle className="text-foreground">예약 현황</PageTitle>
     <Caption className="text-muted-foreground">3박 4일</Caption>
     <Display as="h2" className="text-primary">₩1,200,000</Display>
   ──────────────────────────────────────────────────────────── */

type ShorthandProps = Omit<TypographyProps, 'variant'>;

export const Display      = (p: ShorthandProps) =>
  <Typography variant="display"       {...p} />;

export const PageTitle    = (p: ShorthandProps) =>
  <Typography variant="page-title"    {...p} />;

export const SectionTitle = (p: ShorthandProps) =>
  <Typography variant="section-title" {...p} />;

export const CardTitle    = (p: ShorthandProps) =>
  <Typography variant="card-title"    {...p} />;

export const Body         = (p: ShorthandProps) =>
  <Typography variant="body"          {...p} />;

export const BodyStrong   = (p: ShorthandProps) =>
  <Typography variant="body-strong"   {...p} />;

export const Label        = (p: ShorthandProps) =>
  <Typography variant="label"         {...p} />;

export const Caption      = (p: ShorthandProps) =>
  <Typography variant="caption"       {...p} />;
