import { Calendar, CreditCard, MapPin, Users } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text, useFadeInUp } from '@/design-system';
import type { TournamentStatus, TournamentSummary } from '@/features/tournaments/types';

interface Props {
  tournament: TournamentSummary;
  onPress: () => void;
  delay?: number;
}

/**
 * Card tournoi — port fidèle placeToPadel/src/pages/TournamentsPage.js (cc03a52).
 * Composition : titre + club + badge status à droite, footer (date / ratio équipes / level / type),
 * barre de progression inscriptions orange.
 */

const STATUS_STYLES: Record<
  TournamentStatus,
  { label: string; wrapperClass: string; labelClass: string }
> = {
  open: {
    label: 'Ouvert',
    wrapperClass: 'border border-emerald-200 bg-emerald-50',
    labelClass: 'text-emerald-700',
  },
  full: {
    label: 'Complet',
    wrapperClass: 'border border-amber-200 bg-amber-50',
    labelClass: 'text-amber-700',
  },
  in_progress: {
    label: 'En cours',
    wrapperClass: 'border border-blue-200 bg-blue-50',
    labelClass: 'text-blue-700',
  },
  completed: {
    label: 'Terminé',
    wrapperClass: 'border border-slate-200 bg-slate-50',
    labelClass: 'text-slate-500',
  },
};

function formatDateFR(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/**
 * Parse le prix texte libre ("15€", "20€/équipe", "12,5€", "Gratuit") en euros float.
 * Retourne null si pas de nombre > 0 (miroir du PriceParser backend).
 */
function parsePriceEuros(raw: string | null): number | null {
  if (!raw) return null;
  const normalized = raw.replace(',', '.');
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  return value > 0 ? value : null;
}

export function TournamentCard({ tournament, onPress, delay = 0 }: Props) {
  const fade = useFadeInUp(delay);
  const status = STATUS_STYLES[tournament.status];
  const teamsCount = tournament.teams_count ?? 0;
  const max = tournament.max_teams || 1;
  const progress = Math.min((teamsCount / max) * 100, 100);

  const clubLabel = tournament.club?.name ?? '';
  const locationLabel = tournament.location ?? tournament.club?.city ?? '';
  const placeLine =
    clubLabel && locationLabel ? `${clubLabel} — ${locationLabel}` : clubLabel || locationLabel;

  const priceEuros = parsePriceEuros(tournament.price);
  const isOnline = tournament.payment_method === 'online';

  return (
    <Animated.View style={fade}>
      <Pressable
        onPress={onPress}
        className="rounded-3xl border border-brand-border bg-white p-4"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.04,
          shadowRadius: 30,
          elevation: 2,
        }}
      >
        {/* Titre + badge status */}
        <View className="mb-2 flex-row items-start justify-between">
          <View className="flex-1 pr-2">
            <Text variant="body-medium" className="text-[15px] text-brand-navy" numberOfLines={1}>
              {tournament.name}
            </Text>
            {placeLine ? (
              <View className="mt-1 flex-row items-center gap-1">
                <MapPin size={12} color="#94A3B8" />
                <Text variant="caption" numberOfLines={1} className="flex-1">
                  {placeLine}
                </Text>
              </View>
            ) : null}
          </View>

          <View className={`shrink-0 rounded-full px-2.5 py-0.5 ${status.wrapperClass}`}>
            <Text variant="caption" className={`${status.labelClass} text-[10px] font-heading`}>
              {status.label}
            </Text>
          </View>
        </View>

        {/* Footer : date / équipes / level / type */}
        <View className="mt-3 flex-row flex-wrap items-center gap-3">
          <View className="flex-row items-center gap-1">
            <Calendar size={12} color="#94A3B8" />
            <Text variant="caption" className="text-[11px]">
              {formatDateFR(tournament.date)}
            </Text>
          </View>

          <View className="flex-row items-center gap-1">
            <Users size={12} color="#94A3B8" />
            <Text variant="caption" className="text-[11px]">
              {teamsCount}/{tournament.max_teams}
            </Text>
          </View>

          <View className="rounded-full bg-brand-navy/5 px-2 py-0.5">
            <Text variant="caption" className="text-[10px] font-heading text-brand-navy">
              {tournament.level}
            </Text>
          </View>

          {tournament.type ? (
            <Text variant="caption" className="text-[11px] capitalize">
              {tournament.type}
            </Text>
          ) : null}

          {priceEuros !== null ? (
            <View
              className={`flex-row items-center gap-1 rounded-full px-2 py-0.5 ${
                isOnline ? 'bg-brand-orange-light' : 'bg-slate-100'
              }`}
            >
              <CreditCard size={11} color={isOnline ? '#E8650A' : '#64748B'} />
              <Text
                variant="caption"
                className={`text-[10px] font-heading ${isOnline ? 'text-brand-orange' : 'text-brand-navy'}`}
              >
                {priceEuros.toFixed(0)}€
              </Text>
            </View>
          ) : null}
        </View>

        {/* Barre de progression */}
        <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <View
            className="h-full rounded-full bg-brand-orange"
            style={{ width: `${progress}%` }}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}
