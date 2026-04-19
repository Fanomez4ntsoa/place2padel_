import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Bell,
  Calendar,
  Check,
  CheckCheck,
  ChevronRight,
  Play,
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
import { GameProposalCard } from '@/components/game-proposals/GameProposalCard';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Card, Text } from '@/design-system';
import { formatApiError } from '@/lib/api';
import {
  useCreateFriendlyMatch,
  useFriendlyMatches,
  useUserElo,
} from '@/features/friendly-matches/useFriendlyMatches';
import type { GameProposal } from '@/features/game-proposals/types';
import {
  useCancelGameProposal,
  useGameProposals,
  useRespondGameProposal,
  useStartGameProposal,
} from '@/features/game-proposals/useGameProposals';

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

// Codes couleur alignés Emergent d5ac086 FriendlyMatchPage.js:346-370 :
// orange / green / blue / violet pour les 4 étapes (icône + bg 13% alpha).
interface Feature {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  desc: string;
  iconColor: string;
  iconBg: string;
}

const FEATURES: Feature[] = [
  {
    icon: Users,
    title: 'Invite 3 joueurs',
    desc: 'Choisis ton partenaire et les 2 adversaires.',
    iconColor: '#E8650A',
    iconBg: '#FFF0E6',
  },
  {
    icon: Check,
    title: 'Lance dès que tous prêts',
    desc: 'Chacun accepte, le match démarre.',
    iconColor: '#16A34A',
    iconBg: '#F0FDF4',
  },
  {
    icon: TrendingUp,
    title: 'Score en temps réel',
    desc: 'Double validation capitaine, tie-break intégré.',
    iconColor: '#2563EB',
    iconBg: '#EFF6FF',
  },
  {
    icon: Trophy,
    title: 'Progresse avec ton niveau',
    desc: 'ELO 1-10 ajusté après chaque match.',
    iconColor: '#7C3AED',
    iconBg: '#F5F3FF',
  },
];

function FriendlyMatchLanding({ onRegister }: { onRegister: () => void }) {
  const router = useRouter();
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 80 }} className="bg-brand-bg">
      {/* ── Hero navy centré — port FriendlyMatchPage.js Emergent d5ac086 ── */}
      <LinearGradient
        colors={['#1A2A4A', '#2A4A6A', '#1A3A5A']}
        locations={[0, 0.6, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingHorizontal: 24,
          paddingTop: 48,
          paddingBottom: 40,
          alignItems: 'center',
        }}
      >
        {/* Icône Swords dans carré orange 72×72 */}
        <View
          className="h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-brand-orange"
          style={{
            shadowColor: '#E8650A',
            shadowOpacity: 0.4,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 10,
          }}
        >
          <Swords size={34} color="#FFFFFF" />
        </View>

        {/* Titre + sous-titre */}
        <Text
          className="mt-5 font-heading-black text-white text-center"
          style={{ fontSize: 30, lineHeight: 34 }}
        >
          Match Amical
        </Text>
        <Text
          className="mt-2.5 text-center"
          style={{ fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.65)' }}
        >
          Défie tes amis, score en live{'\n'}et progresse avec ton Niveau
        </Text>

        {/* CTA orange "Commencer la partie" */}
        <Pressable
          onPress={onRegister}
          accessibilityRole="button"
          className="mt-8 flex-row items-center justify-center rounded-[18px] bg-brand-orange px-9"
          style={{
            height: 52,
            shadowColor: '#E8650A',
            shadowOpacity: 0.45,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
            elevation: 10,
          }}
        >
          <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
          <Text
            className="ml-2.5 font-heading-black text-white"
            style={{ fontSize: 16, lineHeight: 20 }}
          >
            Commencer la partie
          </Text>
        </Pressable>

        {/* Disclaimer inscription */}
        <Text
          className="mt-3 text-center"
          style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}
        >
          Gratuit · Inscription en 30 secondes
        </Text>
      </LinearGradient>

      {/* ── Section "Comment ça marche ?" — nos 4 étapes (conservées) ── */}
      <View className="px-5 pt-7">
        <Text
          variant="h3"
          className="mb-4 text-center text-[16px]"
        >
          Comment ça marche ?
        </Text>

        <View className="gap-3">
          {FEATURES.map(({ icon: Icon, title, desc, iconColor, iconBg }, i) => (
            <Card key={title}>
              <View className="flex-row items-start gap-3">
                <View
                  className="h-10 w-10 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: iconBg }}
                >
                  <Icon size={18} color={iconColor} />
                </View>
                <View className="flex-1">
                  <Text variant="body-medium" className="text-[13px]">
                    {i + 1}. {title}
                  </Text>
                  <Text variant="caption" className="mt-0.5 text-[12px]">
                    {desc}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      </View>

      {/* ── CTA final "Prêt à jouer ?" — port Emergent d5ac086 FriendlyMatchPage.js:390-406 ── */}
      <View className="mt-6 px-5">
        <LinearGradient
          colors={['#1A2A4A', '#2A4A6A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 20,
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: 24,
            alignItems: 'center',
          }}
        >
          <Text
            className="font-heading-black text-white text-center"
            style={{ fontSize: 18, lineHeight: 22 }}
          >
            Prêt à jouer ?
          </Text>
          <Text
            className="mt-1.5 text-center"
            style={{ fontSize: 12, lineHeight: 17, color: 'rgba(255,255,255,0.55)' }}
          >
            Rejoins des milliers de joueurs sur PlaceToPadel
          </Text>

          <Pressable
            onPress={onRegister}
            accessibilityRole="button"
            className="mt-5 flex-row items-center justify-center rounded-2xl bg-brand-orange px-8"
            style={{
              height: 48,
              shadowColor: '#E8650A',
              shadowOpacity: 0.35,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}
          >
            <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
            <Text
              className="ml-2 font-heading-black text-white"
              style={{ fontSize: 15, lineHeight: 18 }}
            >
              Commencer la partie
            </Text>
          </Pressable>

          {/* Lien "Déjà inscrit ? Se connecter" */}
          <View className="mt-3 flex-row items-center">
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
              Déjà inscrit ?{' '}
            </Text>
            <Pressable
              onPress={() => router.push('/(auth)/login')}
              hitSlop={6}
              accessibilityRole="link"
            >
              <Text
                className="font-heading-black text-brand-orange"
                style={{ fontSize: 11 }}
              >
                Se connecter
              </Text>
            </Pressable>
          </View>
        </LinearGradient>
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
  const proposalsQuery = useGameProposals();
  const respondProposalMut = useRespondGameProposal();
  const cancelProposalMut = useCancelGameProposal();
  const startProposalMut = useStartGameProposal();

  const [createOpen, setCreateOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  const openMatch = (uuid: string) => router.push((`/match/${uuid}/live`) as never);

  const elo = myEloQuery.data;
  const statPlayed = elo?.matches_played ?? 0;
  const statWon = elo?.matches_won ?? 0;
  const statLost = elo?.matches_lost ?? 0;

  const handleRespond = (p: GameProposal, response: 'accepted' | 'refused') =>
    respondProposalMut
      .mutateAsync({ uuid: p.uuid, response })
      .catch((err) => Alert.alert('Erreur', formatApiError(err)));

  const handleCancel = (p: GameProposal) =>
    Alert.alert('Annuler la partie', 'Confirmer l\'annulation ?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui, annuler',
        style: 'destructive',
        onPress: () =>
          cancelProposalMut
            .mutateAsync(p.uuid)
            .catch((err) => Alert.alert('Erreur', formatApiError(err))),
      },
    ]);

  const handleStart = async (p: GameProposal) => {
    // MVP : assigne automatiquement les 3 premiers accepted dans l'ordre des invitees.
    // Phase 6.2 v2 : écran dédié pour choisir les rôles.
    const acceptedInvitees = p.invitees.filter((i) => i.response === 'accepted' && i.user);
    if (acceptedInvitees.length < 3) {
      Alert.alert('Impossible', '3 joueurs invités acceptés requis.');
      return;
    }
    try {
      const { friendly_match_uuid } = await startProposalMut.mutateAsync({
        uuid: p.uuid,
        partner_uuid: acceptedInvitees[0].user!.uuid,
        opponent1_uuid: acceptedInvitees[1].user!.uuid,
        opponent2_uuid: acceptedInvitees[2].user!.uuid,
      });
      router.push(`/match/${friendly_match_uuid}/live` as never);
    } catch (err) {
      Alert.alert('Erreur', formatApiError(err));
    }
  };

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-brand-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ── Hero navy compact — port FriendlyMatchPage.js Emergent d5ac086 ── */}
        <LinearGradient
          colors={['#1A2A4A', '#2A4A6A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24 }}
        >
          <View className="flex-row items-center gap-3">
            <View
              className="h-11 w-11 items-center justify-center rounded-[14px]"
              style={{ backgroundColor: 'rgba(232,101,10,0.13)' }}
            >
              <Swords size={22} color="#E8650A" />
            </View>
            <View className="flex-1">
              <Text
                className="font-heading-black text-white"
                style={{ fontSize: 22, lineHeight: 26 }}
              >
                Match Amical
              </Text>
              <Text className="text-white/60" style={{ fontSize: 12 }}>
                Joue · Score · Progresse
              </Text>
            </View>
          </View>

          {/* Stats row 3 tiles — intégrées dans le hero navy */}
          <View className="mt-4 flex-row gap-2">
            <HeroStatTile value={statPlayed} label="Joués" />
            <HeroStatTile value={statWon} label="Victoires" valueColor="#4ADE80" />
            <HeroStatTile value={statLost} label="Défaites" valueColor="#F87171" />
          </View>
        </LinearGradient>

        <View className="-mt-6 gap-4 px-5">
          {/* ELO Card (déclaré vs ELO + barre progression) */}
          {myEloQuery.data ? <EloCard elo={myEloQuery.data} /> : (
            <Card><ActivityIndicator color="#E8650A" /></Card>
          )}

          {/* CTA principal — Commence la Partie */}
          <Button
            label="Commence la Partie"
            leftIcon={<Play size={18} color="#FFFFFF" fill="#FFFFFF" />}
            onPress={() => setCreateOpen(true)}
          />

          {/* Card "Règles du match" — look bleu light, chevron Voir */}
          <Pressable
            onPress={() => setRulesOpen(true)}
            className="flex-row items-center justify-between rounded-2xl border bg-[#EFF6FF] px-4 py-3"
            style={{ borderColor: '#BFDBFE', borderWidth: 1.5 }}
          >
            <View className="flex-row items-center gap-2.5">
              <View
                className="h-7 w-7 items-center justify-center rounded-lg"
                style={{ backgroundColor: '#DBEAFE' }}
              >
                <CheckCheck size={15} color="#2563EB" />
              </View>
              <Text
                className="font-heading-black"
                style={{ fontSize: 13, color: '#1E40AF' }}
              >
                Règles du match
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Text className="font-heading" style={{ fontSize: 11, color: '#3B82F6' }}>
                Voir
              </Text>
              <ChevronRight size={16} color="#3B82F6" />
            </View>
          </Pressable>

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

          {/* Propose une partie — section game-proposals (label aligné Emergent d5ac086) */}
          {proposalsQuery.data && proposalsQuery.data.length > 0 ? (
            <Section
              icon={<Calendar size={14} color="#E8650A" />}
              title={`Propose une partie (${proposalsQuery.data.length})`}
            >
              {proposalsQuery.data.map((p) => (
                <GameProposalCard
                  key={p.uuid}
                  proposal={p}
                  viewerUuid={user?.uuid ?? null}
                  pending={
                    respondProposalMut.isPending ||
                    cancelProposalMut.isPending ||
                    startProposalMut.isPending
                  }
                  onAccept={() => handleRespond(p, 'accepted')}
                  onRefuse={() => handleRespond(p, 'refused')}
                  onCancel={() => handleCancel(p)}
                  onStart={() => handleStart(p)}
                  onOpenMatch={() =>
                    p.friendly_match &&
                    router.push(`/match/${p.friendly_match.uuid}/live` as never)
                  }
                />
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
      <RulesModal visible={rulesOpen} onClose={() => setRulesOpen(false)} />
    </SafeAreaView>
  );
}

/**
 * Tile d'une stat dans le hero navy — transparent bg (white/8), valeur 20px
 * black, label 10px semi-bold white/50. Valeur colorée optionnelle (vert/rouge).
 */
function HeroStatTile({
  value,
  label,
  valueColor = '#FFFFFF',
}: {
  value: number;
  label: string;
  valueColor?: string;
}) {
  return (
    <View
      className="flex-1 items-center rounded-xl py-2.5"
      style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
    >
      <Text
        className="font-heading-black"
        style={{ fontSize: 20, lineHeight: 24, color: valueColor }}
      >
        {value}
      </Text>
      <Text
        className="font-body-medium"
        style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}
      >
        {label}
      </Text>
    </View>
  );
}

const RULES: { num: string; title: string; text: string }[] = [
  {
    num: '1',
    title: 'Format',
    text: "Un match se joue en 9 jeux. En cas d'égalité à 8-8, un tie-break est joué pour départager les équipes.",
  },
  {
    num: '2',
    title: 'Saisie du score',
    text: 'Tu peux noter le score à la fin du match ou à chaque changement de côté. Les boutons + et − ajustent le score à tout moment.',
  },
  {
    num: '3',
    title: 'Valider la partie',
    text: 'À la fin, chaque équipe doit confirmer le résultat. Le score est validé quand les deux capitaines ont confirmé.',
  },
  {
    num: '4',
    title: 'Ton Niveau',
    text: 'Après chaque partie validée, ton Niveau (1 à 10) est mis à jour en fonction de tes résultats et du niveau de tes adversaires. Il se déverrouille après 10 parties.',
  },
];

function RulesModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/40" />
      <View className="rounded-t-3xl bg-white px-5 pb-8 pt-4">
        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View
              className="h-7 w-7 items-center justify-center rounded-lg"
              style={{ backgroundColor: '#DBEAFE' }}
            >
              <CheckCheck size={15} color="#2563EB" />
            </View>
            <Text variant="h2" className="text-[18px]">
              Règles du match
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8}>
            <X size={22} color="#1A2A4A" />
          </Pressable>
        </View>

        <View className="gap-0">
          {RULES.map((r, i) => (
            <View
              key={r.num}
              className={`flex-row gap-3 py-3 ${
                i < RULES.length - 1 ? 'border-b border-brand-border/60' : ''
              }`}
            >
              <View
                className="h-6 w-6 items-center justify-center rounded-full"
                style={{ backgroundColor: '#E8650A' }}
              >
                <Text
                  className="font-heading-black text-white"
                  style={{ fontSize: 11, lineHeight: 13 }}
                >
                  {r.num}
                </Text>
              </View>
              <View className="flex-1">
                <Text variant="body-medium" className="text-[13px]">
                  {r.title}
                </Text>
                <Text variant="caption" className="mt-0.5 text-[12px]" style={{ lineHeight: 17 }}>
                  {r.text}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Button label="J'ai compris" onPress={onClose} className="mt-5" />
      </View>
    </Modal>
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
