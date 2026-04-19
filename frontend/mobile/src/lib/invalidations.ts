import type { QueryClient } from '@tanstack/react-query';

/**
 * Invalide toutes les caches feed-dépendantes. À appeler après toute action
 * qui déclenche la création d'un post (système ou user) côté backend :
 * - upload photo de profil → les anciens posts affichent l'ancienne photo
 * - création de tournoi → listener backend crée un post système tournament_created
 * - inscription à un tournoi → post système potentiel (milestones)
 * - création/validation match amical → post système de résultat
 *
 * Centralisé ici pour éviter les oublis lors de l'ajout de nouvelles mutations.
 * Les deux clés couvrent le fil principal (/feed) et les onglets profil
 * (/profile/{uuid}/posts).
 */
export function invalidateFeedKeys(qc: QueryClient): void {
  qc.invalidateQueries({ queryKey: ['feed'] });
  qc.invalidateQueries({ queryKey: ['profile-posts'] });
}
