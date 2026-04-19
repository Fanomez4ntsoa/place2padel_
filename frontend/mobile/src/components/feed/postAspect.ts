import type { PostAspect } from '@/features/feed/types';

/**
 * Ratio d'affichage image en fonction du hint backend `post_aspect`.
 * Défaut = 4/5 (portrait doux Instagram-like, valeur par défaut Emergent).
 */
export function aspectRatioFor(aspect: PostAspect): number {
  switch (aspect) {
    case 'square':
      return 1;
    case 'landscape':
      return 16 / 9;
    case 'portrait':
    default:
      return 4 / 5;
  }
}
