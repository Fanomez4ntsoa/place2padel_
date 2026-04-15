/**
 * Palette verrouillée — port fidèle de placeToPadel/frontend/src/index.css.
 * Ne modifier qu'avec validation produit.
 */
export const colors = {
  bg: '#FFF8F4',
  surface: '#FFFFFF',
  surfaceMuted: '#F3EBE5',

  primary: '#E8650A',
  primaryHover: '#C75508',
  primaryLight: '#FFF0E6',

  structure: '#1A2A4A',
  structureMuted: '#3A4A6A',

  text: '#1A2A4A',
  textMuted: '#64748B',

  border: '#F0EBE8',

  success: '#059669',
  danger: '#DC2626',
  live: '#FF3B30',
} as const;

export type ColorName = keyof typeof colors;
