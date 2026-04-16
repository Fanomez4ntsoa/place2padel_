import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  Bell,
  Check,
  ChevronRight,
  Plus,
  Swords,
  TrendingUp,
  Trophy,
  Users,
  X,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EloCard } from '@/components/friendly-matches/EloCard';
import { FriendlyMatchRow } from '@/components/friendly-matches/FriendlyMatchRow';
import { UserPickerModal } from '@/components/friendly-matches/UserPickerModal';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Card, Text } from '@/design-system';
import { formatApiError } from '@/lib/api';
import {
  useCreateFriendlyMatch,
  useFriendlyMatches,
  useUserElo,
} from '@/features/friendly-matches/useFriendlyMatches';

interface PickedUser {
  uuid: string;
  name: string;
  picture_url: string | null;
}

/**
 * FriendlyMatchPage — port essentiel Emergent 39b6544.
 * - Non-auth : hero marketing + 4 features + CTA register
 * - Auth : ELO card + liste mes matchs + bouton création (modal 3 pickers)
 */
export default function FriendlyMatchScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const isLoggedIn = !!user;

  if (!isLoggedIn) {
    return <FriendlyMatchLanding onRegister={() => router.push('/(auth)/register')} />;
  }

  return <FriendlyMatchDashboard />;
}

// ─── Landing non-auth ──────────────────────────────────────────

const FEATURES: { icon: React.ComponentType<{ size?: number; color?: string }>; title: string; desc: string }[] = [
  { icon: Users, title: 'Invite 3 joueurs', desc: 'Choisis ton partenaire et les 2 adversaires.' },
  { icon: Check, title: 'Lance dès que tous prêts', desc: 'Chacun accepte, le match démarre.' },
  { icon: TrendingUp, title: 'Score en temps réel', desc: 'Double validation capitaine, tie-break intégré.' },
  { icon: Trophy, title: 'Progresse avec ton niveau', desc: 'ELO 1-10 ajusté après chaque match.' },
];

function FriendlyMatchLanding({ onRegister }: { onRegister: () => void }) {
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 80 }} className="bg-brand-bg">
      <LinearGradient
        colors={['#1A2A4A', '#2A4A6A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 24, paddingTop: 40, paddingBottom: 48 }}
      >
        <View className="self-start rounded-full bg-brand-orange/20 px-3 py-1">
          <Text variant="caption" className="font-heading-black text-brand-orange text-[11px]">
            MATCH AMICAL
          </Text>
        </View>
        <Text className="mt-3 font-heading-black text-[28px] leading-[32px] text-white">
          Joue, score,{'\n'}
          <Text className="text-brand-orange font-heading-black">progresse.</Text>
        </Text>
        <Text variant="caption" className="mt-3 text-white/70">
          Lance un match amical entre amis. Score en temps réel, niveau ELO qui évolue à chaque
          partie.
        </Text>
      </LinearGradient>

      <View className="-mt-6 gap-3 px-5">
        {FEATURES.map(({ icon: Icon, title, desc }, i) => (
          <Card key={title}>
            <View className="flex-row items-start gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-brand-orange-light">
                <Icon size={18} color="#E8650A" />
              </View>
              <View className="flex-1">
                <Text variant="body-medium" className="text-[13px]">
                  {i + 1}. {title}
                </Text>
                <Text variant="caption" className="mt-0.5 text-[12px]">{desc}</Text>
              </View>
            </View>
          </Card>
        ))}
      </View>

      <View className="mt-6 px-5">
        <Button
          label="Créer mon compte gratuitement"
          leftIcon={<ArrowRight size={18} color="#FFFFFF" />}
          onPress={onRegister}
        />
      </View>
    </ScrollView>
  );
}

// ─── Dashboard auth ────────────────────────────────────────────

function FriendlyMatchDashboard() {
  const router = useRouter();
  const { user } = useAuth();

  const myEloQuery = useUserElo(user?.uuid);
  const pendingMatches = useFriendlyMatches('pending');
  const inProgressMatches = useFriendlyMatches('in_progress');

  const [createOpen, setCreateOpen] = useState(false);

  const openMatch = (uuid: string) => router.push((`/match/${uuid}/live`) as never);

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-brand-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <LinearGradient
          colors={['#1A2A4A', '#2A4A6A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 }}
        >
          <Text variant="caption" className="text-white/50">Matchs amicaux</Text>
          <Text variant="h1" className="mt-1 text-white">
            Joue, score, progresse
          </Text>
        </LinearGradient>

        <View className="-mt-6 gap-4 px-5">
          {/* ELO Card */}
          {myEloQuery.data ? <EloCard elo={myEloQuery.data} /> : (
            <Card><ActivityIndicator color="#E8650A" /></Card>
          )}

          {/* CTA créer */}
          <Button
            label="Lancer un match"
            leftIcon={<Plus size={18} color="#FFFFFF" />}
            onPress={() => setCreateOpen(true)}
          />

          {/* Invitations reçues / en attente */}
          {pendingMatches.data && pendingMatches.data.length > 0 ? (
            <Section
              icon={<Bell size={14} color="#E8650A" />}
              title={`Invitations (${pendingMatches.data.length})`}
            >
              {pendingMatches.data.map((m) => (
                <FriendlyMatchRow key={m.uuid} match={m} onPress={() => openMatch(m.uuid)} />
              ))}
            </Section>
          ) : null}

          {/* Matchs en cours */}
          {inProgressMatches.data && inProgressMatches.data.length > 0 ? (
            <Section
              icon={<Swords size={14} color="#E8650A" />}
              title={`En cours (${inProgressMatches.data.length})`}
            >
              {inProgressMatches.data.map((m) => (
                <FriendlyMatchRow key={m.uuid} match={m} onPress={() => openMatch(m.uuid)} />
              ))}
            </Section>
          ) : null}

          {/* Empty state global */}
          {!pendingMatches.isLoading &&
          !inProgressMatches.isLoading &&
          (pendingMatches.data?.length ?? 0) === 0 &&
          (inProgressMatches.data?.length ?? 0) === 0 ? (
            <Card>
              <View className="items-center py-4">
                <Swords size={24} color="#CBD5E1" />
                <Text variant="body-medium" className="mt-2 text-[14px]">
                  Aucun match pour l'instant
                </Text>
                <Text variant="caption" className="mt-1 text-center">
                  Invite 3 joueurs pour lancer ton premier match amical.
                </Text>
              </View>
            </Card>
          ) : null}

          {/* Lien historique profil */}
          <Pressable
            onPress={() => router.push(`/profil/${user!.uuid}`)}
            className="flex-row items-center justify-between rounded-2xl border border-brand-border bg-white px-4 py-3"
          >
            <View className="flex-row items-center gap-2">
              <Trophy size={14} color="#1A2A4A" />
              <Text variant="caption" className="text-[13px] font-heading">
                Voir mon historique
              </Text>
            </View>
            <ChevronRight size={14} color="#94A3B8" />
          </Pressable>
        </View>
      </ScrollView>

      <CreateFriendlyMatchModal visible={createOpen} onClose={() => setCreateOpen(false)} />
    </SafeAreaView>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View>
      <View className="mb-2 flex-row items-center gap-1.5">
        {icon}
        <Text
          variant="caption"
          className="text-[11px] font-heading-black uppercase tracking-wider text-brand-orange"
        >
          {title}
        </Text>
      </View>
      <View className="gap-2">{children}</View>
    </View>
  );
}

// ─── Create modal ──────────────────────────────────────────────

function CreateFriendlyMatchModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const createMut = useCreateFriendlyMatch();

  const [partner, setPartner] = useState<PickedUser | null>(null);
  const [opp1, setOpp1] = useState<PickedUser | null>(null);
  const [opp2, setOpp2] = useState<PickedUser | null>(null);
  const [picker, setPicker] = useState<'partner' | 'opp1' | 'opp2' | null>(null);

  const canSubmit = partner && opp1 && opp2 && !createMut.isPending;

  const reset = () => {
    setPartner(null);
    setOpp1(null);
    setOpp2(null);
    setPicker(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!partner || !opp1 || !opp2) return;
    try {
      const match = await createMut.mutateAsync({
        partner_uuid: partner.uuid,
        opponent1_uuid: opp1.uuid,
        opponent2_uuid: opp2.uuid,
      });
      reset();
      onClose();
      router.push(`/match/${match.uuid}/live` as never);
    } catch (err) {
      Alert.alert('Erreur', formatApiError(err));
    }
  };

  const excludeSet = [user?.uuid, partner?.uuid, opp1?.uuid, opp2?.uuid].filter(Boolean) as string[];

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
        <Pressable onPress={handleClose} className="flex-1 bg-black/40" />
        <View className="rounded-t-3xl bg-white px-5 pb-8 pt-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text variant="h2" className="text-[18px]">Nouveau match amical</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <X size={22} color="#1A2A4A" />
            </Pressable>
          </View>
          <Text variant="caption" className="mb-4 text-[12px]">
            Sélectionne ton partenaire et les 2 adversaires. Ils devront accepter.
          </Text>

          <SlotPicker
            team="Mon équipe"
            slot="Partenaire"
            user={partner}
            onOpen={() => setPicker('partner')}
            onClear={() => setPartner(null)}
          />

          <View className="my-2 items-center">
            <Text variant="caption" className="text-[11px] font-heading-black tracking-wider">
              VS
            </Text>
          </View>

          <SlotPicker
            team="Équipe adverse"
            slot="Adversaire 1 (capitaine)"
            user={opp1}
            onOpen={() => setPicker('opp1')}
            onClear={() => setOpp1(null)}
          />
          <View className="h-2" />
          <SlotPicker
            team=""
            slot="Adversaire 2"
            user={opp2}
            onOpen={() => setPicker('opp2')}
            onClear={() => setOpp2(null)}
          />

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
        title={
          picker === 'partner'
            ? 'Choisir mon partenaire'
            : picker === 'opp1'
              ? 'Choisir adversaire 1'
              : 'Choisir adversaire 2'
        }
        excludeUuids={excludeSet}
        onPick={(u) => {
          if (picker === 'partner') setPartner(u);
          else if (picker === 'opp1') setOpp1(u);
          else if (picker === 'opp2') setOpp2(u);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
    </>
  );
}

function SlotPicker({
  team,
  slot,
  user,
  onOpen,
  onClear,
}: {
  team: string;
  slot: string;
  user: PickedUser | null;
  onOpen: () => void;
  onClear: () => void;
}) {
  return (
    <View>
      {team ? (
        <Text variant="caption" className="mb-1 text-[10px] font-heading-black uppercase tracking-wider">
          {team}
        </Text>
      ) : null}
      <Pressable
        onPress={onOpen}
        className="flex-row items-center gap-3 rounded-2xl border border-brand-border bg-brand-bg px-4 py-3"
      >
        <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-orange-light">
          <Users size={16} color="#E8650A" />
        </View>
        <View className="flex-1">
          <Text variant="body" className={`text-[13px] ${user ? '' : 'text-brand-muted'}`}>
            {user?.name ?? slot}
          </Text>
        </View>
        {user ? (
          <Pressable onPress={onClear} hitSlop={6}>
            <X size={16} color="#94A3B8" />
          </Pressable>
        ) : (
          <ChevronRight size={16} color="#94A3B8" />
        )}
      </Pressable>
    </View>
  );
}
