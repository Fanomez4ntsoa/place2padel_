import { Building2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Modal, Pressable, View } from 'react-native';

import { Button, Text } from '@/design-system';
import type { Club } from '@/features/clubs/types';
import { useClaimClub } from '@/features/clubs/useClubs';
import { formatApiError } from '@/lib/api';

interface Props {
  club: Club | null;
  onClose: () => void;
  onSuccess: (club: Club) => void;
}

/**
 * Bottom-sheet de revendication d'un club — appelé depuis ClubsScreen pour les users
 * role=club_owner ou admin sur un club sans owner_id. Impose le choix club_type.
 */
export function ClaimClubSheet({ club, onClose, onSuccess }: Props) {
  const [clubType, setClubType] = useState<'associatif' | 'prive' | null>(null);
  const claimMut = useClaimClub();

  const submit = async () => {
    if (!club || !clubType) {
      Alert.alert('Champ requis', 'Indique si ton club est associatif ou privé.');
      return;
    }
    try {
      const claimed = await claimMut.mutateAsync({
        club_uuid: club.uuid,
        club_type: clubType,
      });
      onSuccess(claimed);
    } catch (err) {
      Alert.alert('Erreur', formatApiError(err));
    }
  };

  if (!club) return null;

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/55" />
      <View className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-6 pb-10 pt-5">
        <Pressable onPress={onClose} hitSlop={8} className="absolute right-4 top-4 z-10">
          <X size={22} color="#1A2A4A" />
        </Pressable>

        <View className="mb-4 flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-orange-light">
            <Building2 size={22} color="#E8650A" />
          </View>
          <View className="flex-1">
            <Text variant="h3">Revendiquer {club.name}</Text>
            <Text variant="caption" className="text-[12px]">
              {club.city}
              {club.postal_code ? ` (${club.postal_code})` : ''}
            </Text>
          </View>
        </View>

        <Text variant="body" className="mb-4">
          Une fois revendiqué, tu pourras gérer la page de ce club, publier des annonces et voir
          ses tournois.
        </Text>

        <Text
          variant="caption"
          className="mb-2 font-heading text-[10px] uppercase tracking-wider"
        >
          Type de club *
        </Text>
        <View className="flex-row gap-2">
          {(
            [
              { value: 'associatif', label: 'Associatif', emoji: '🤝' },
              { value: 'prive', label: 'Privé', emoji: '🏢' },
            ] as const
          ).map((opt) => {
            const active = clubType === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setClubType(opt.value)}
                className="flex-1 items-center rounded-2xl border px-3 py-3"
                style={{
                  borderColor: active ? '#1A2A4A' : '#F0EBE8',
                  borderWidth: active ? 2 : 1,
                  backgroundColor: active ? '#EEF1F7' : '#FFFFFF',
                }}
              >
                <Text className="text-[22px]">{opt.emoji}</Text>
                <Text className="mt-1 font-heading text-[13px] text-brand-navy">
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Button
          label={claimMut.isPending ? 'Association...' : "C'est mon club — Revendiquer"}
          onPress={submit}
          loading={claimMut.isPending}
          className="mt-5"
        />
      </View>
    </Modal>
  );
}
