import { useRouter } from 'expo-router';
import {
  Calendar,
  GraduationCap,
  Heart,
  Home as HomeIcon,
  Sparkles,
  Star,
  Swords,
  Trophy,
  X,
  Zap,
} from 'lucide-react-native';
import { ComponentType, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useAuth } from '@/contexts/AuthContext';
import { Text, useFadeInUp } from '@/design-system';

type IconCmp = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

type PopupKey = 'rencontre' | 'coaching' | 'stage' | 'animation' | 'reservation';

interface PopupContent {
  emoji: string;
  title: string;
  desc: string;
  color: string;
  bg: string;
}

const POPUPS: Record<PopupKey, PopupContent> = {
  rencontre: {
    emoji: '❤️',
    title: 'Mode Rencontre',
    desc: 'Trouve des joueurs près de toi qui partagent ta passion. Le matching sportif nouvelle génération.',
    color: '#EC4899',
    bg: '#FDF2F8',
  },
  coaching: {
    emoji: '⚡',
    title: 'Coaching',
    desc: "Trouve ton coach padel idéal près de chez toi. Réserve une session en quelques secondes.",
    color: '#D97706',
    bg: '#FFFBEB',
  },
  stage: {
    emoji: '🎾',
    title: 'Stages Padel',
    desc: 'Des stages pour tous les niveaux — débutants, intermédiaires, compétiteurs. Progresse avec les meilleurs.',
    color: '#16A34A',
    bg: '#F0FDF4',
  },
  animation: {
    emoji: '⭐',
    title: 'Animation',
    desc: 'Tournois internes, événements club, soirées padel. Toute la vie associative au même endroit.',
    color: '#E8650A',
    bg: '#FFF0E6',
  },
  reservation: {
    emoji: '📅',
    title: 'Réservation de terrain',
    desc: "Réserve ton terrain en quelques secondes, n'importe où, n'importe quand.",
    color: '#2563EB',
    bg: '#EFF6FF',
  },
};

type GridAction = { type: 'nav'; href: string } | { type: 'popup'; key: PopupKey };

interface GridCard {
  key: string;
  label: string;
  icon: IconCmp;
  iconColor: string;
  cardBg: string;
  action: GridAction;
  badge?: { text: string; variant: 'new' | 'soon' };
  highlight?: 'lightblue';
}

/**
 * Grille 9 cases — port fidèle placeToPadel/src/pages/HomePage.js d541157.
 * Ordre strict : Tournois, Match, Partenaire(New), Rencontre, Clubs,
 * Coaching, Stage, Animation, Réservation.
 */
const GRID: GridCard[] = [
  { key: 'tournois', label: 'Tournois', icon: Trophy, iconColor: '#E8650A', cardBg: '#FFF0E6',
    action: { type: 'nav', href: '/(tabs)/tournois' } },
  { key: 'match', label: 'Match', icon: Swords, iconColor: '#2563EB', cardBg: '#EFF6FF',
    action: { type: 'nav', href: '/(tabs)/partenaires' } },
  { key: 'partenaire', label: 'Partenaire', icon: Zap, iconColor: '#FFFFFF', cardBg: '#DBEAFE',
    highlight: 'lightblue', badge: { text: 'New', variant: 'new' },
    action: { type: 'nav', href: '/(tabs)/partenaires' } },
  { key: 'rencontre', label: 'Rencontre', icon: Heart, iconColor: '#EC4899', cardBg: '#FDF2F8',
    action: { type: 'popup', key: 'rencontre' } },
  { key: 'clubs', label: 'Clubs', icon: HomeIcon, iconColor: '#7C3AED', cardBg: '#F5F3FF',
    action: { type: 'nav', href: '/(tabs)/clubs' } },
  { key: 'coaching', label: 'Coaching', icon: GraduationCap, iconColor: '#D97706', cardBg: '#FFFBEB',
    badge: { text: 'À venir', variant: 'soon' }, action: { type: 'popup', key: 'coaching' } },
  { key: 'stage', label: 'Stage', icon: Sparkles, iconColor: '#16A34A', cardBg: '#F0FDF4',
    badge: { text: 'À venir', variant: 'soon' }, action: { type: 'popup', key: 'stage' } },
  { key: 'animation', label: 'Animation', icon: Star, iconColor: '#E8650A', cardBg: '#FFF0E6',
    badge: { text: 'À venir', variant: 'soon' }, action: { type: 'popup', key: 'animation' } },
  { key: 'reservation', label: 'Réservation', icon: Calendar, iconColor: '#2563EB', cardBg: '#EFF6FF',
    badge: { text: 'À venir', variant: 'soon' }, action: { type: 'popup', key: 'reservation' } },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activePopup, setActivePopup] = useState<PopupKey | null>(null);

  const fadeHero = useFadeInUp(0);
  const popup = activePopup ? POPUPS[activePopup] : null;
  const firstName = user?.first_name ?? user?.name?.split(' ')[0];

  const handle = (card: GridCard) => {
    if (card.action.type === 'nav') {
      router.push(card.action.href as never);
    } else {
      setActivePopup(card.action.key);
    }
  };

  return (
    <View className="flex-1 bg-brand-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Hero navy */}
        <Animated.View
          style={fadeHero}
          className="mx-3 mt-3 overflow-hidden rounded-3xl bg-brand-navy p-5"
        >
          {firstName ? (
            <Text variant="caption" className="mb-2 text-white/45">
              Bonjour {firstName} 👋
            </Text>
          ) : null}

          <Text className="font-heading-black text-[28px] uppercase leading-[28px] tracking-tight text-white">
            JOUE AU PADEL
          </Text>
          <View className="mt-2 h-[3px] w-9 rounded-full bg-brand-orange" />

          <View className="mt-3 gap-1">
            <Text className="font-heading-black text-[20px] tracking-tight">
              <Text className="font-heading-black text-brand-orange">Quand </Text>
              <Text className="font-heading-black text-white/85">tu veux,</Text>
            </Text>
            <Text className="font-heading-black text-[20px] tracking-tight">
              <Text className="font-heading-black text-brand-orange">Où </Text>
              <Text className="font-heading-black text-white/85">tu veux,</Text>
            </Text>
            <Text className="font-heading-black text-[20px] tracking-tight">
              <Text className="font-heading-black text-brand-orange">Avec </Text>
              <Text className="font-heading-black text-white/85">qui tu veux.</Text>
            </Text>
          </View>

          <Pressable
            onPress={() => router.push('/(tabs)/matching')}
            className="mt-4 flex-row items-center self-start gap-2 rounded-full bg-blue-100 px-3.5 py-2"
          >
            <View className="h-5 w-5 items-center justify-center rounded-full bg-brand-orange">
              <Zap size={11} color="#FFFFFF" strokeWidth={3} />
            </View>
            <Text className="font-heading-black text-[12px] text-blue-900">
              Matching en quelques clics →
            </Text>
          </Pressable>
        </Animated.View>

        {/* Grille 3×3 */}
        <View className="mt-4 flex-row flex-wrap gap-2.5 px-3.5">
          {GRID.map((card, i) => (
            <GridTile key={card.key} card={card} index={i} onPress={() => handle(card)} />
          ))}
        </View>

        {/* Bannière juge arbitre */}
        <OrganizerBanner onPress={() => router.push('/organisateurs')} />
      </ScrollView>

      {popup ? (
        <Modal transparent animationType="fade" onRequestClose={() => setActivePopup(null)}>
          <Pressable onPress={() => setActivePopup(null)} className="flex-1 bg-black/55" />
          <View
            className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-6 pb-10 pt-5"
            style={{ borderTopColor: popup.color, borderTopWidth: 4 }}
          >
            <Pressable
              onPress={() => setActivePopup(null)}
              hitSlop={8}
              className="absolute right-4 top-4 z-10"
            >
              <X size={22} color="#1A2A4A" />
            </Pressable>
            <View
              className="mb-4 h-16 w-16 items-center justify-center rounded-2xl"
              style={{ backgroundColor: popup.bg }}
            >
              <Text className="text-[28px]">{popup.emoji}</Text>
            </View>
            <Text variant="h2" className="text-[22px]">{popup.title}</Text>
            <Text variant="body" className="mt-2">{popup.desc}</Text>
            <View className="mt-4 self-start rounded-full bg-slate-100 px-3 py-1">
              <Text variant="caption" className="font-heading text-brand-muted text-[11px]">À venir</Text>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function GridTile({
  card,
  index,
  onPress,
}: {
  card: GridCard;
  index: number;
  onPress: () => void;
}) {
  const Icon = card.icon;
  const fade = useFadeInUp(index * 40);
  const isHighlight = card.highlight === 'lightblue';

  const cardStyle = isHighlight
    ? {
        backgroundColor: '#DBEAFE',
        borderColor: '#93C5FD',
        borderWidth: 1.5,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 14,
        elevation: 3,
      }
    : {
        backgroundColor: '#FFFFFF',
        borderColor: '#F0EBE8',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 1,
      };

  const iconBg = isHighlight ? '#E8650A' : card.cardBg;
  const labelColor = isHighlight ? '#1E40AF' : '#1A2A4A';

  return (
    <Animated.View style={[fade, { width: '31.5%' }]}>
      <Pressable
        onPress={onPress}
        className="items-center rounded-[18px] px-2.5 py-3.5"
        style={cardStyle}
      >
        {card.badge ? (
          <View
            className="absolute right-1.5 top-1.5 rounded-full px-1.5 py-[1px]"
            style={{ backgroundColor: card.badge.variant === 'new' ? '#E8650A' : '#94A3B8' }}
          >
            <Text className="font-heading-black text-[7px] uppercase text-white">
              {card.badge.text}
            </Text>
          </View>
        ) : null}

        <View
          className="mb-1.5 h-[42px] w-[42px] items-center justify-center rounded-[13px]"
          style={{ backgroundColor: iconBg }}
        >
          <Icon size={20} color={card.iconColor} strokeWidth={2.5} />
        </View>
        <Text
          className="font-heading-black text-[11px]"
          style={{ color: labelColor, textAlign: 'center' }}
          numberOfLines={1}
        >
          {card.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function OrganizerBanner({ onPress }: { onPress: () => void }) {
  const fade = useFadeInUp(400);
  return (
    <Animated.View style={fade} className="mx-3.5 mt-4">
      <Pressable
        onPress={onPress}
        className="flex-row items-center justify-between rounded-[18px] border-[1.5px] border-brand-orange bg-brand-orange-light px-4 py-3.5"
      >
        <View className="flex-1 pr-3">
          <Text className="font-heading-black text-[14px] text-brand-orange">
            Tu es juge arbitre ?
          </Text>
          <Text variant="caption" className="mt-0.5 text-[11px]" style={{ color: '#C75508' }}>
            Organise ton tournoi en 5 min ⚡
          </Text>
        </View>
        <View className="rounded-xl bg-brand-orange px-3.5 py-2">
          <Text className="font-heading text-[12px] text-white">Découvrir →</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
