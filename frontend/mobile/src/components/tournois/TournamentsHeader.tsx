import { MapPin, X } from 'lucide-react-native';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { Text } from '@/design-system';

interface Props {
  city: string;
  onCityChange: (v: string) => void;
  radius: number;
  onRadiusChange: (r: number) => void;
}

/**
 * Header filtres écran Tournois — port fidèle placeToPadel d541157.
 * Pas de titre ni back : AppHeader global (Phase 6.1.5) prend le relais,
 * et cet onglet est un tab principal (pas de navigation retour attendue).
 *
 * Composition :
 *   - Pill ville : icône MapPin orange + TextInput + bouton X de reset
 *   - Label "RAYON DE RECHERCHE" + pills horizontaux (10/20/30/50/100/200 km)
 *
 * NB : le radius est purement informatif côté UI tant que le backend ne gère
 * pas le filtrage géographique (cf. commentaire useTournaments).
 */

const RADIUS_OPTIONS = [10, 20, 30, 50, 100, 200] as const;

export function TournamentsHeader({ city, onCityChange, radius, onRadiusChange }: Props) {
  return (
    <View className="border-b border-brand-border/60 bg-white/95 px-5 pb-3 pt-3">
      {/* Ville */}
      <View className="flex-row items-center gap-2.5 rounded-2xl border border-brand-border bg-brand-bg px-3.5 py-2.5">
        <MapPin size={18} color="#E8650A" />
        <TextInput
          value={city}
          onChangeText={onCityChange}
          placeholder="Ville ou code postal (ex: Agde, 34300...)"
          placeholderTextColor="#94A3B8"
          className="flex-1 font-body text-[14px] text-brand-navy"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {city.length > 0 ? (
          <Pressable onPress={() => onCityChange('')} hitSlop={8}>
            <X size={16} color="#94A3B8" />
          </Pressable>
        ) : null}
      </View>

      {/* Rayon */}
      <View className="mt-2.5">
        <Text
          variant="caption"
          className="mb-1.5 font-body-medium uppercase tracking-[0.8px] text-brand-muted text-[10px]"
        >
          Rayon de recherche
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 2, gap: 6 }}
        >
          {RADIUS_OPTIONS.map((r) => {
            const active = radius === r;
            return (
              <Pressable
                key={r}
                onPress={() => onRadiusChange(r)}
                className={`rounded-full border px-3 py-1 ${
                  active
                    ? 'border-brand-orange bg-brand-orange'
                    : 'border-brand-border bg-white'
                }`}
              >
                <Text
                  variant="caption"
                  className={`font-heading text-[12px] ${active ? 'text-white' : 'text-brand-muted'}`}
                >
                  {r} km
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}
