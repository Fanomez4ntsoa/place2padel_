/**
 * Types notifications — miroir NotificationResource backend Phase 3.
 * Types émis par Laravel (au 2026-04-16) :
 *   message, new_tournament, proposal_response, tournament_complete,
 *   tournament_partner, tournament_full, milestone_50, milestone_90
 *
 * Types Emergent additionnels (prêts pour futures features, fallback Bell si inconnu) :
 *   match_start, registration, waitlist, waitlist_promoted, new_post,
 *   match, proposal
 */
export interface AppNotification {
  uuid: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationsPage {
  data: AppNotification[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  };
}
