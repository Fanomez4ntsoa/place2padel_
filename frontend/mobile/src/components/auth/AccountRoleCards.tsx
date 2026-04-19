import { ArrowRight, Building2, Trophy, User as UserIcon } from 'lucide-react-native';
import { ComponentType } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/design-system';

/**
 * 3 cartes "Je suis ..." partagées entre CockpitPreview (non-auth) et
 * RegisterPage AccountTypeSelector — port fidèle RegisterPage.js
 * Emergent d5ac086. Tailles calibrées pour tenir 3 cartes + hero + login
 * bar dans un Pixel 7 sans scroll (p-3, icon 44, title 15, chips 10).
 */
export type AccountRole = 'player' | 'referee' | 'club_owner';

interface RoleDef {
  role: AccountRole;
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  title: string;
  subtitle: string;
  chips: string[];
}

export const ACCOUNT_ROLES: RoleDef[] = [
  {
    role: 'player',
    icon: UserIcon,
    title: 'Je suis joueur ou coach',
    subtitle: 'Tournois, matching partenaire, matchs amicaux près de chez toi.',
    chips: [
      'Gratuit',
      'Tournois',
      'Matchs amicaux',
      'Matching partenaire',
      'Score live',
      '% Compatibilité de jeu',
    ],
  },
  {
    role: 'referee',
    icon: Trophy,
    title: 'Je suis juge arbitre',
    subtitle: 'Crée et gère tes tournois en 5 minutes. Gratuit pour toujours.',
    chips: ['Gratuit', '100% automatisé', 'Tableaux automatiques', 'Score live'],
  },
  {
    role: 'club_owner',
    icon: Building2,
    title: 'Je suis patron de club',
    subtitle:
      'Gère la page de ton club, publie des annonces, vois tes membres et tes tournois.',
    chips: ['Page club', 'Mes membres', 'Mes tournois', 'Publications', 'Boutique à venir'],
  },
];

export function AccountRoleCardsList({
  onPick,
}: {
  onPick: (role: AccountRole) => void;
}) {
  return (
    <View className="gap-2 px-4 pb-4 pt-2.5">
      {ACCOUNT_ROLES.map((r) => (
        <AccountRoleCard
          key={r.role}
          icon={r.icon}
          title={r.title}
          subtitle={r.subtitle}
          chips={r.chips}
          variant={r.role}
          onPress={() => onPick(r.role)}
        />
      ))}
    </View>
  );
}

function AccountRoleCard({
  icon: Icon,
  title,
  subtitle,
  chips,
  variant,
  onPress,
}: {
  icon: ComponentType<{ size?: number; color?: string }>;
  title: string;
  subtitle: string;
  chips: string[];
  variant: AccountRole;
  onPress: () => void;
}) {
  const styles = VARIANT_STYLES[variant];
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl p-3"
      style={{
        backgroundColor: styles.cardBg,
        borderWidth: 1.5,
        borderColor: styles.cardBorder,
      }}
    >
      <View
        className="items-center justify-center rounded-xl"
        style={{ width: 44, height: 44, backgroundColor: styles.iconBg }}
      >
        <Icon size={20} color={styles.iconColor} />
      </View>
      <View className="flex-1">
        <Text
          className="font-heading-black text-[15px]"
          style={{ color: styles.titleColor, marginBottom: 2, lineHeight: 18 }}
        >
          {title}
        </Text>
        <Text style={{ fontSize: 11, color: styles.subColor, lineHeight: 15 }}>
          {subtitle}
        </Text>
        <View className="mt-1.5 flex-row flex-wrap" style={{ gap: 4 }}>
          {chips.map((chip) => (
            <View
              key={chip}
              className="rounded-full px-2 py-0.5"
              style={{ backgroundColor: styles.chipBg }}
            >
              <Text
                className="font-heading"
                style={{ fontSize: 10, color: styles.chipColor, lineHeight: 13 }}
              >
                {chip}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <ArrowRight size={16} color={styles.arrowColor} />
    </Pressable>
  );
}

const VARIANT_STYLES: Record<
  AccountRole,
  {
    cardBg: string;
    cardBorder: string;
    iconBg: string;
    iconColor: string;
    titleColor: string;
    subColor: string;
    chipBg: string;
    chipColor: string;
    arrowColor: string;
  }
> = {
  player: {
    cardBg: '#FFF0E6',
    cardBorder: '#E8650A',
    iconBg: '#E8650A',
    iconColor: '#FFFFFF',
    titleColor: '#1A2A4A',
    subColor: '#64748B',
    chipBg: 'rgba(232,101,10,0.15)',
    chipColor: '#C75508',
    arrowColor: '#E8650A',
  },
  referee: {
    cardBg: '#E8650A',
    cardBorder: '#E8650A',
    iconBg: 'rgba(255,255,255,0.2)',
    iconColor: '#FFFFFF',
    titleColor: '#FFFFFF',
    subColor: 'rgba(255,255,255,0.8)',
    chipBg: 'rgba(255,255,255,0.2)',
    chipColor: '#FFFFFF',
    arrowColor: 'rgba(255,255,255,0.9)',
  },
  club_owner: {
    cardBg: '#FFFFFF',
    cardBorder: '#1A2A4A',
    iconBg: '#1A2A4A',
    iconColor: '#FFFFFF',
    titleColor: '#1A2A4A',
    subColor: '#64748B',
    chipBg: '#EEF1F7',
    chipColor: '#1A2A4A',
    arrowColor: '#1A2A4A',
  },
};
