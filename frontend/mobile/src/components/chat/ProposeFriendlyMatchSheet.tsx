import { useRouter } from 'expo-router';
import { Swords, Users, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Modal, Pressable, View } from 'react-native';

import { UserPickerModal } from '@/components/friendly-matches/UserPickerModal';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Text } from '@/design-system';
import { useCreateFriendlyMatch } from '@/features/friendly-matches/useFriendlyMatches';
import { formatApiError } from '@/lib/api';

interface PickedUser {
  uuid: string;
  name: string;
  picture_url: string | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  /** L'interlocuteur du chat — pré-rempli comme adversaire 1 (verrouillé). */
  opponent1: PickedUser;
}

/**
 * Sheet pour proposer un match amical depuis le chat. L'interlocuteur est
 * pré-rempli comme adversaire 1 (slot locked) ; l'user choisit son partenaire
 * et le 2e adversaire. Sur Create → navigue vers /match/{uuid}/live.
 *
 * Aligné sur `CreateFriendlyMatchModal` de (tabs)/match/index.tsx mais avec
 * le slot opp1 forcé.
 */
export function ProposeFriendlyMatchSheet({ visible, onClose, opponent1 }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const createMut = useCreateFriendlyMatch();

  const [partner, setPartner] = useState<PickedUser | null>(null);
  const [opp2, setOpp2] = useState<PickedUser | null>(null);
  const [picker, setPicker] = useState<'partner' | 'opp2' | null>(null);

  const canSubmit = partner && opp2 && !createMut.isPending;

  const reset = () => {
    setPartner(null);
    setOpp2(null);
    setPicker(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!partner || !opp2) return;
    try {
      const match = await createMut.mutateAsync({
        partner_uuid: partner.uuid,
        opponent1_uuid: opponent1.uuid,
        opponent2_uuid: opp2.uuid,
      });
      reset();
      onClose();
      router.push(`/match/${match.uuid}/live` as never);
    } catch (err) {
      Alert.alert('Erreur', formatApiError(err));
    }
  };

  const excludeSet = [user?.uuid, opponent1.uuid, partner?.uuid, opp2?.uuid].filter(
    Boolean,
  ) as string[];

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
        <Pressable onPress={handleClose} className="flex-1 bg-black/50" />
        <View className="rounded-t-3xl bg-white px-5 pb-8 pt-4">
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Swords size={18} color="#E8650A" />
              <Text variant="h2" className="text-[17px]">
                Match amical
              </Text>
            </View>
            <Pressable onPress={handleClose} hitSlop={8}>
              <X size={22} color="#1A2A4A" />
            </Pressable>
          </View>
          <Text variant="caption" className="mb-4 text-[12px]">
            {opponent1.name} est pré-rempli comme adversaire. Choisis ton partenaire et le 2e
            adversaire — ils devront accepter.
          </Text>

          <SlotRow team="Mon équipe" slot="Partenaire" user={partner}
            onOpen={() => setPicker('partner')} onClear={() => setPartner(null)} />

          <View className="my-2 items-center">
            <Text variant="caption" className="text-[11px] font-heading-black tracking-wider">
              VS
            </Text>
          </View>

          <SlotRow team="Équipe adverse" slot="Adversaire 1" user={opponent1} locked />
          <View className="h-2" />
          <SlotRow team="" slot="Adversaire 2" user={opp2}
            onOpen={() => setPicker('opp2')} onClear={() => setOpp2(null)} />

          <Button
            label={createMut.isPending ? 'Création…' : "Créer l'invitation"}
            disabled={!canSubmit}
            loading={createMut.isPending}
            onPress={handleSubmit}
            className="mt-5"
          />
        </View>
      </Modal>

      <UserPickerModal
        visible={picker !== null}
        title={picker === 'partner' ? 'Choisir mon partenaire' : 'Choisir adversaire 2'}
        excludeUuids={excludeSet}
        onPick={(u) => {
          if (picker === 'partner') setPartner(u);
          else if (picker === 'opp2') setOpp2(u);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
    </>
  );
}

function SlotRow({
  team,
  slot,
  user,
  onOpen,
  onClear,
  locked,
}: {
  team: string;
  slot: string;
  user: PickedUser | null;
  onOpen?: () => void;
  onClear?: () => void;
  locked?: boolean;
}) {
  return (
    <View>
      {team ? (
        <Text
          variant="caption"
          className="mb-1 text-[10px] font-heading-black uppercase tracking-wider"
        >
          {team}
        </Text>
      ) : null}
      <Pressable
        onPress={locked ? undefined : onOpen}
        disabled={locked}
        className="flex-row items-center gap-3 rounded-2xl border border-brand-border bg-brand-bg px-4 py-3"
        style={{ opacity: locked ? 0.9 : 1 }}
      >
        <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-orange-light">
          <Users size={16} color="#E8650A" />
        </View>
        <View className="flex-1">
          <Text variant="body" className={`text-[13px] ${user ? '' : 'text-brand-muted'}`}>
            {user?.name ?? slot}
          </Text>
        </View>
        {user && !locked && onClear ? (
          <Pressable onPress={onClear} hitSlop={6}>
            <X size={16} color="#94A3B8" />
          </Pressable>
        ) : locked ? (
          <Text variant="caption" className="text-[10px] text-brand-orange font-heading">
            verrouillé
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}
