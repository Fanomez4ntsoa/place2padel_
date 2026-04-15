import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Bell,
  ChevronRight,
  Heart,
  LogOut,
  MessageCircle,
  Plus,
  Swords,
  Trophy,
  User as UserIcon,
} from 'lucide-react-native';
import { ComponentType } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { Badge, Button, Card, Text, useFadeInUp } from '@/design-system';
import { formatApiError } from '@/lib/api';
import Animated from 'react-native-reanimated';

type IconCmp = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

export default function CockpitScreen() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  if (loading) {
    return <View className="flex-1 bg-brand-bg" />;
  }

  if (!user) {
    return <CockpitPreview onRegister={() => router.push('/(auth)/register')} onLogin={() => router.push('/(auth)/login')} />;
  }

  const isReferee = user.role === 'referee' || user.role === 'admin';

  const handleLogout = () =>
    Alert.alert('Déconnexion', 'Se déconnecter de Place2Padel ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            router.replace('/(auth)/login');
          } catch (err) {
            Alert.alert('Erreur', formatApiError(err));
          }
        },
      },
    ]);

  return isReferee ? (
    <CockpitReferee name={user.first_name ?? user.name} onLogout={handleLogout} />
  ) : (
    <CockpitPlayer
      name={user.first_name ?? user.name}
      userUuid={user.uuid}
      padelPoints={(user as unknown as { profile?: { padel_points?: number } }).profile?.padel_points}
      onLogout={handleLogout}
    />
  );
}

// ──────────────────────────────────────────────────────────────────
// Preview non authentifié
// ──────────────────────────────────────────────────────────────────
function CockpitPreview({ onRegister, onLogin }: { onRegister: () => void; onLogin: () => void }) {
  const fade = useFadeInUp(0);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-brand-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <LinearGradient
          colors={['#1A2A4A', '#2A4A6A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48 }}
        >
          <Text variant="caption" className="text-white/50">Mon cockpit</Text>
          <Text variant="h1" className="mt-1 text-white">
            Qui es-tu ?
          </Text>
          <Text variant="caption" className="mt-2 text-white/60">
            Découvre ton cockpit personnel selon ton profil.
          </Text>
        </LinearGradient>

        <Animated.View style={fade} className="-mt-6 gap-4 px-5">
          <RoleCard
            icon={Swords}
            title="Compétiteur"
            subtitle="Joueur de padel"
            description="Trouve des tournois, inscris-toi, suis tes scores en direct, gère tes partenaires et ton classement FFT."
            onPress={onRegister}
          />
          <RoleCard
            icon={Trophy}
            title="Juge arbitre"
            subtitle="Organisateur"
            description="Crée tes tournois, gère les inscriptions, génère les tableaux et les convocations en un clic."
            onPress={onRegister}
          />

          <Button label="Je suis déjà inscrit" variant="ghost" onPress={onLogin} className="mt-2" />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RoleCard({
  icon: Icon,
  title,
  subtitle,
  description,
  onPress,
}: {
  icon: IconCmp;
  title: string;
  subtitle: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Card>
        <View className="mb-3 flex-row items-center gap-4">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-brand-orange-light">
            <Icon size={26} color="#E8650A" />
          </View>
          <View>
            <Text variant="h3">{title}</Text>
            <Text variant="caption">{subtitle}</Text>
          </View>
        </View>
        <Text variant="caption">{description}</Text>
      </Card>
    </Pressable>
  );
}

// ──────────────────────────────────────────────────────────────────
// Cockpit joueur authentifié
// ──────────────────────────────────────────────────────────────────
function CockpitPlayer({
  name,
  userUuid,
  padelPoints,
  onLogout,
}: {
  name?: string;
  userUuid: string;
  padelPoints?: number;
  onLogout: () => void;
}) {
  const router = useRouter();
  const fade = useFadeInUp(0);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-brand-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <LinearGradient
          colors={['#1A2A4A', '#2A4A6A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 }}
        >
          <Text variant="caption" className="text-white/50">
            Bonjour {name ?? ''} 👋
          </Text>
          <Text variant="h1" className="mt-1 text-white">
            Mon cockpit
          </Text>

          {typeof padelPoints === 'number' ? (
            <View className="mt-4 flex-row items-center gap-3">
              <Badge label={`${padelPoints} pts FFT`} tone="info" />
              <Badge label="Compétiteur" tone="neutral" />
            </View>
          ) : null}
        </LinearGradient>

        <Animated.View style={fade} className="-mt-6 gap-3 px-5">
          <ActionCard
            icon={Trophy}
            label="Mes tournois"
            subtitle="Tous mes engagements"
            onPress={() => router.push('/(tabs)/tournois')}
          />
          <ActionCard
            icon={Bell}
            label="Notifications"
            subtitle="Dispo dans une prochaine itération"
            onPress={() => undefined}
            disabled
          />
          <ActionCard
            icon={MessageCircle}
            label="Messages"
            subtitle="Dispo dans une prochaine itération"
            onPress={() => undefined}
            disabled
          />
          <ActionCard
            icon={Heart}
            label="Partenaires"
            subtitle="Matching — Phase 6.2"
            onPress={() => undefined}
            disabled
          />
          <ActionCard
            icon={UserIcon}
            label="Mon profil"
            subtitle="Voir et éditer"
            onPress={() => router.push(`/profil/${userUuid}`)}
          />

          <Button
            label="Se déconnecter"
            variant="ghost"
            onPress={onLogout}
            leftIcon={<LogOut size={18} color="#1A2A4A" />}
            className="mt-2"
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────────────────────────
// Cockpit juge arbitre / admin
// ──────────────────────────────────────────────────────────────────
function CockpitReferee({ name, onLogout }: { name?: string; onLogout: () => void }) {
  const router = useRouter();
  const fade = useFadeInUp(0);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-brand-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <LinearGradient
          colors={['#1A2A4A', '#2A4A6A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 }}
        >
          <Text variant="caption" className="text-white/50">
            Bonjour {name ?? ''} 👋
          </Text>
          <Text variant="h1" className="mt-1 text-white">
            Cockpit arbitre
          </Text>
          <Text variant="caption" className="mt-2 text-white/60">
            Gère tes tournois et les joueurs inscrits.
          </Text>
        </LinearGradient>

        <Animated.View style={fade} className="-mt-6 gap-3 px-5">
          <Button
            label="Créer un tournoi"
            leftIcon={<Plus size={18} color="#FFFFFF" />}
            onPress={() => Alert.alert('Bientôt', 'Création de tournoi arrive en Phase 6.2.')}
          />

          <ActionCard
            icon={Trophy}
            label="Mes tournois"
            subtitle="Tous mes tournois organisés"
            onPress={() => router.push('/(tabs)/tournois')}
          />
          <ActionCard
            icon={Bell}
            label="Notifications"
            subtitle="Dispo dans une prochaine itération"
            onPress={() => undefined}
            disabled
          />
          <ActionCard
            icon={MessageCircle}
            label="Messages"
            subtitle="Dispo dans une prochaine itération"
            onPress={() => undefined}
            disabled
          />

          <Button
            label="Se déconnecter"
            variant="ghost"
            onPress={onLogout}
            leftIcon={<LogOut size={18} color="#1A2A4A" />}
            className="mt-2"
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────────────────────────
// ActionCard réutilisable
// ──────────────────────────────────────────────────────────────────
function ActionCard({
  icon: Icon,
  label,
  subtitle,
  onPress,
  disabled,
}: {
  icon: IconCmp;
  label: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} disabled={disabled}>
      <Card className={disabled ? 'opacity-60' : ''}>
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand-bg">
            <Icon size={20} color="#1A2A4A" />
          </View>
          <View className="flex-1">
            <Text variant="body-medium">{label}</Text>
            <Text variant="caption" className="mt-0.5">
              {subtitle}
            </Text>
          </View>
          <ChevronRight size={16} color="#94A3B8" />
        </View>
      </Card>
    </Pressable>
  );
}
