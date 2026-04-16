import { useMutation, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

interface CheckoutCreated {
  transaction_uuid: string;
  session_id: string;
  checkout_url: string | null;
  amount_cents: number;
  currency: string;
  status: string;
}

interface CheckoutStatus {
  transaction_uuid: string;
  session_id: string;
  status: 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled';
  payment_status: 'paid' | 'pending';
  tournament_uuid: string | null;
  completed_at: string | null;
}

/**
 * Crée une session Stripe Checkout pour un tournoi online — retourne
 * l'URL externe Stripe à ouvrir en WebView ou in-app browser.
 */
export function useCreateCheckout() {
  return useMutation({
    mutationFn: async (tournamentUuid: string) => {
      const { data } = await api.post('/payments/checkout/create', {
        tournament_uuid: tournamentUuid,
      });
      return data.data as CheckoutCreated;
    },
  });
}

/**
 * Polling du statut après retour Stripe (success_url contient ?session_id=xxx).
 * Refetch toutes les 2.5s jusqu'à paid|failed|expired|cancelled.
 */
export function useCheckoutStatus(sessionId: string | null) {
  return useQuery<CheckoutStatus>({
    queryKey: ['checkout-status', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data } = await api.get(`/payments/checkout/status/${sessionId}`);
      return data.data as CheckoutStatus;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'paid' || status === 'failed' || status === 'expired' || status === 'cancelled'
        ? false
        : 2500;
    },
    staleTime: 0,
  });
}
