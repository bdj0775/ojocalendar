export const ICON_SIZES = {
  xs:   12,
  sm:   16,
  md:   20,
  base: 24,
  lg:   32,
} as const;

export type IconSize = typeof ICON_SIZES[keyof typeof ICON_SIZES];
