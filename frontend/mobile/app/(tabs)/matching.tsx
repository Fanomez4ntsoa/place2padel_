import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowRight, Bell, Heart, MessageCircle, Trophy, Users, X, Zap } from 'lucide-react-native';
import { ComponentType } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInLeft } from 'react-native-reanimated';

import { useAuth } from '@/contexts/AuthContext';
import { Text } from '@/design-system';

type IconCmp = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

/**
 * Port fidèle placeToPadel/src/pages/MatchingPage.js (d541157).
 * Page marketing matching partenaires — hero + bloc IA + 3 étapes + après match + avant/après + CTA.
 */

const APRES_MATCH: { icon: IconCmp; iconColor: string; bg: string; title: string; desc: string }[] = [
  {
    icon: MessageCircle,
    iconColor: '#16a34a',
    bg: '#F0FDF4',
    title: "Un dialogue fluide s'ouvre",
    desc: "Contacte ton partenaire directement dans l'app. Fini les échanges éparpillés.",
  },
  {
    icon: Bell,
    iconColor: '#E8650A',
    bg: '#FFF0E6',
    title: 'Notifications intelligentes',
    desc: 'Alerte quand un joueur compatible est dispo sur tes créneaux habituels.',
  },
  {
    icon: Trophy,
    iconColor: '#2563EB',
    bg: '#EFF6FF',
    title: 'Propose un tournoi ensemble',
    desc: 'Invite-le sur un tournoi ou crée-en un pour vous deux depuis le chat.',
  },
  {
    icon: Users,
    iconColor: '#ec4899',
    bg: '#FDF2F8',
    title: 'Match amical organisé en 2 clics',
    desc: "Propose un match selon vos créneaux communs. L'app gère tout.",
  },
];

const AVANT = ['Demander au club', 'Groupes WhatsApp', 'Niveaux incompatibles', 'Organisation compliquée', 'Pas de réponse'];
const APRES = ['Profils qualifiés', 'Niveau vérifié FFT', 'Dialogue fluide', 'Recherche simplifiée', 'Match en 2 clics'];

export default function MatchingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const isLoggedIn = !!user;

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF8F4' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* HERO */}
        <LinearGradient
          colors={['#1A2A4A', '#2A4A6A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 18, paddingTop: 24, paddingBottom: 24, alignItems: 'center', overflow: 'hidden' }}
        >
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 14 }}
          >
            <View style={{ alignItems: 'center', gap: 4 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8650A' }}>
                <Users size={26} color="#fff" />
              </View>
              <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)' }}>Joueur A</Text>
            </View>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', marginBottom: 14 }}>
              <Heart size={13} color="#E8650A" fill="#E8650A" />
            </View>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB' }}>
                <Users size={26} color="#fff" />
              </View>
              <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)' }}>Joueur B</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(300)}>
            <Text className="font-heading-black" style={{ fontSize: 22, color: '#fff', textAlign: 'center', letterSpacing: -0.5, lineHeight: 26 }}>
              Trouve ton partenaire{'\n'}padel idéal
            </Text>
          </Animated.View>

          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 19, marginTop: 8, marginBottom: 14 }}>
            Like ou passe. Quand c'est un match,{'\n'}joue ensemble immédiatement.
          </Text>

          <Animated.View
            entering={FadeIn.delay(200).duration(300)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(219,234,254,0.15)', borderWidth: 1, borderColor: 'rgba(219,234,254,0.3)', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 5 }}
          >
            <Text style={{ fontSize: 12 }}>🤖</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#DBEAFE' }}>IA · Compatibilité automatique</Text>
          </Animated.View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
          {/* BLOC IA */}
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={{ backgroundColor: '#EFF6FF', borderRadius: 18, borderWidth: 1.5, borderColor: '#BFDBFE', padding: 14, marginBottom: 20, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}
          >
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 18 }}>🤖</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text className="font-heading-black" style={{ fontSize: 13, color: '#1A2A4A', marginBottom: 6 }}>
                L'IA calcule ta compatibilité
              </Text>
              <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                {['Niveau FFT', 'Côté de jeu', 'Disponibilités'].map((t) => (
                  <View key={t} style={{ backgroundColor: '#DBEAFE', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ color: '#2563EB', fontSize: 10, fontWeight: '700' }}>{t}</Text>
                  </View>
                ))}
              </View>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 50, height: 7, overflow: 'hidden' }}>
                <View style={{ width: '87%', height: '100%', backgroundColor: '#E8650A', borderRadius: 50 }} />
              </View>
              <Text style={{ fontSize: 11, color: '#E8650A', fontWeight: '800', marginTop: 4 }}>
                87% compatible avec ce joueur
              </Text>
            </View>
          </Animated.View>

          {/* COMMENT ÇA MARCHE */}
          <Text className="font-heading-black" style={{ fontSize: 16, color: '#1A2A4A', letterSpacing: -0.3, marginBottom: 12 }}>
            Comment ça marche ?
          </Text>

          <StepCard
            num="1"
            bg="#E8650A"
            title="Tu vois des profils filtrés"
            desc="Niveau, côté de jeu, club, zone — seulement les joueurs compatibles avec toi."
            delay={50}
          />

          <Animated.View
            entering={FadeInDown.delay(100).duration(300)}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#F0EBE8', marginBottom: 8 }}
          >
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#1A2A4A', alignItems: 'center', justifyContent: 'center' }}>
              <Text className="font-heading-black" style={{ fontSize: 13, color: '#fff' }}>2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text className="font-heading-black" style={{ fontSize: 12, color: '#1A2A4A', marginBottom: 8 }}>Like ou Passe</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 8, alignItems: 'center' }}>
                  <X size={18} color="#ef4444" />
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#ef4444', marginTop: 2 }}>Passe</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#FFF0E6', borderRadius: 10, padding: 8, alignItems: 'center' }}>
                  <Heart size={18} color="#E8650A" />
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#E8650A', marginTop: 2 }}>Like</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(150).duration(300)}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, backgroundColor: '#FFF0E6', borderRadius: 16, borderWidth: 1.5, borderColor: '#E8650A', marginBottom: 20 }}
          >
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8650A', alignItems: 'center', justifyContent: 'center' }}>
              <Text className="font-heading-black" style={{ fontSize: 13, color: '#fff' }}>3</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text className="font-heading-black" style={{ fontSize: 12, color: '#E8650A', marginBottom: 4 }}>
                C'est un Match !
              </Text>
              <Text style={{ fontSize: 10, color: '#C75508', lineHeight: 15, marginBottom: 10 }}>
                Quand les 2 se likent, c'est parti !
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' }}>
                  <Trophy size={16} color="#C75508" />
                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#C75508', marginTop: 3 }}>Jouer un tournoi</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' }}>
                  <Zap size={16} color="#C75508" />
                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#C75508', marginTop: 3 }}>Match amical</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* APRÈS LE MATCH */}
          <Text className="font-heading-black" style={{ fontSize: 16, color: '#1A2A4A', letterSpacing: -0.3, marginBottom: 12 }}>
            Après le match, que se passe-t-il ?
          </Text>

          <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#F0EBE8', marginBottom: 16 }}>
            {APRES_MATCH.map((a, i) => {
              const Icon = a.icon;
              return (
                <Animated.View
                  key={a.title}
                  entering={FadeInLeft.delay(i * 50).duration(300)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: i < APRES_MATCH.length - 1 ? 1 : 0, borderBottomColor: '#F0EBE8' }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: a.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} color={a.iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text className="font-heading-black" style={{ fontSize: 12, color: '#1A2A4A', marginBottom: 2 }}>{a.title}</Text>
                    <Text style={{ fontSize: 10, color: '#64748b', lineHeight: 15 }}>{a.desc}</Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>

          {/* PROBLÈME / SOLUTION */}
          <Text className="font-heading-black" style={{ fontSize: 16, color: '#1A2A4A', letterSpacing: -0.3, marginBottom: 12 }}>
            Le problème qu'on résout
          </Text>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <BeforeAfterColumn mode="before" items={AVANT} />
            <BeforeAfterColumn mode="after" items={APRES} />
          </View>

          {/* CTA */}
          <View style={{ gap: 10, paddingBottom: 20 }}>
            {isLoggedIn ? (
              <MatchingCTA
                label="Trouver mon partenaire"
                onPress={() => router.push('/(tabs)/partenaires')}
              />
            ) : (
              <>
                <MatchingCTA
                  label="Créer mon compte gratuitement"
                  onPress={() => router.push('/(auth)/register')}
                />
                <Pressable
                  onPress={() => router.push('/(tabs)/partenaires')}
                  style={{ backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#F0EBE8', borderRadius: 18, paddingVertical: 15, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A2A4A' }}>Voir les profils</Text>
                </Pressable>
              </>
            )}
            <Text style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>
              100% gratuit · Matching IA · Disponible maintenant
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function StepCard({ num, bg, title, desc, delay }: { num: string; bg: string; title: string; desc: string; delay: number }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(300)}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#F0EBE8', marginBottom: 8 }}
    >
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text className="font-heading-black" style={{ fontSize: 13, color: '#fff' }}>{num}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text className="font-heading-black" style={{ fontSize: 12, color: '#1A2A4A', marginBottom: 2 }}>{title}</Text>
        <Text style={{ fontSize: 10, color: '#64748b', lineHeight: 15 }}>{desc}</Text>
      </View>
    </Animated.View>
  );
}

function BeforeAfterColumn({ mode, items }: { mode: 'before' | 'after'; items: string[] }) {
  const isAfter = mode === 'after';
  return (
    <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 18, borderWidth: isAfter ? 2 : 1, borderColor: isAfter ? '#E8650A' : '#F0EBE8', padding: 14 }}>
      <Text style={{ fontSize: 9, fontWeight: '800', color: isAfter ? '#E8650A' : '#ef4444', letterSpacing: 0.8, marginBottom: 10 }}>
        {isAfter ? 'APRÈS' : 'AVANT'}
      </Text>
      {items.map((item) => (
        <View key={item} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: isAfter ? '#E8650A' : '#fca5a5' }}>
            {isAfter ? '✓' : '✕'}
          </Text>
          <Text style={{ fontSize: 10, color: isAfter ? '#1A2A4A' : '#94a3b8', fontWeight: isAfter ? '700' : '400', flex: 1 }}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

function MatchingCTA({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ backgroundColor: '#E8650A', borderRadius: 18, paddingVertical: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}
    >
      <Text className="font-heading-black" style={{ fontSize: 16, color: '#fff' }}>{label}</Text>
      <ArrowRight size={20} color="#fff" />
    </Pressable>
  );
}
