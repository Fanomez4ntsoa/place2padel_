import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowRight, Bell, Trophy, Users, Zap } from 'lucide-react-native';
import { ComponentType, ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { useAuth } from '@/contexts/AuthContext';
import { Text } from '@/design-system';

type IconCmp = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

/**
 * Port fidèle placeToPadel/src/pages/OrganisateursPage.js (d541157).
 * Page marketing juges arbitres — hero + avantages + 4 étapes + avant/après + gratuit + CTA.
 */

const AVANTAGES: { icon: IconCmp; iconColor: string; bg: string; title: string; desc: string }[] = [
  {
    icon: Zap,
    iconColor: '#E8650A',
    bg: '#FFF0E6',
    title: 'Crée ton tournoi en 5 minutes',
    desc: 'Nom, date, niveau, terrains — ton tournoi est en ligne et ouvert aux inscriptions immédiatement.',
  },
  {
    icon: Users,
    iconColor: '#2563EB',
    bg: '#EFF6FF',
    title: 'Inscriptions gérées seules',
    desc: "Les joueurs s'inscrivent seuls. Liste d'attente automatique. Tu vois tout en temps réel.",
  },
  {
    icon: Trophy,
    iconColor: '#7C3AED',
    bg: '#F5F3FF',
    title: 'Tableaux générés en 1 clic',
    desc: 'Poules, élimination, têtes de série — le moteur choisit le meilleur format et génère tout.',
  },
  {
    icon: Bell,
    iconColor: '#16a34a',
    bg: '#F0FDF4',
    title: 'Joueurs convoqués automatiquement',
    desc: 'Horaires, terrain, adversaire — chaque joueur reçoit sa convocation. Zéro WhatsApp. Zéro Excel.',
  },
];

const ETAPES: { num: string; title: string; desc: string; color: string; badge?: string }[] = [
  {
    num: '1',
    title: "Tableau live sur l'app",
    desc: 'Chaque joueur voit son tableau depuis son téléphone. Il saisit lui-même le score à chaque changement de terrain.',
    color: '#E8650A',
  },
  {
    num: '2',
    title: 'Terrains attribués automatiquement',
    desc: "Dès qu'un match se termine, le suivant est planifié automatiquement et le terrain attribué sans intervention.",
    color: '#E8650A',
  },
  {
    num: '3',
    title: "Appel à l'arbitre intégré",
    desc: 'En cas de litige, un joueur appuie sur un bouton. Tu reçois une notification avec le terrain concerné.',
    color: '#E8650A',
    badge: "🚨 Appeler l'arbitre — Terrain 3",
  },
  {
    num: '4',
    title: 'Classement final automatique',
    desc: 'À la fin du tournoi, le classement intégral de toutes les équipes est généré. Du 1er au dernier. Sans rien faire.',
    color: '#1A2A4A',
  },
];

const AVANT = ['WhatsApp', 'Excel', 'Relances manuelles', 'Convocs à la main', 'Scores papier', 'Classement manuel', 'Stress le jour J'];
const APRES = ['1 lien à partager', 'Tableau auto', 'Notifs auto', 'Convocs auto', 'Scores live', 'Classement final', 'Zéro stress'];
const GRATUIT = ['Créer et gérer un tournoi', 'Scores live et classement final', 'Convocations automatiques'];

export default function OrganisateursScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const isLoggedIn = !!user;

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF8F4' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* 1. HERO */}
        <LinearGradient
          colors={['#1A2A4A', '#2A4A6A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 32, overflow: 'hidden' }}
        >
          <Animated.View
            entering={FadeIn.duration(300)}
            style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(232,101,10,0.2)', borderWidth: 1, borderColor: 'rgba(232,101,10,0.4)', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 16 }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#E8650A' }} />
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#E8650A', letterSpacing: 0.8 }}>
              SPÉCIAL JUGES ARBITRES
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(300)}>
            <Text className="font-heading-black" style={{ fontSize: 30, color: '#fff', letterSpacing: -1, lineHeight: 34 }}>
              Organise ton tournoi{'\n'}
              <Text className="font-heading-black" style={{ color: '#E8650A' }}>en 5 minutes.</Text>{'\n'}
              Puis ne t'en occupe plus.
            </Text>
          </Animated.View>

          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 22, marginTop: 12, marginBottom: 20 }}>
            PlaceToPadel automatise tout — inscriptions, tableaux, convocations, scores live et classement final.
          </Text>

          <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
            {[
              { value: 'Gratuit', sub: '0€ POUR TOUJOURS' },
              { value: '100%', sub: 'AUTOMATIQUE' },
            ].map((s, i) => (
              <View
                key={s.value}
                style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', borderRightWidth: i === 0 ? 1 : 0, borderRightColor: 'rgba(255,255,255,0.08)' }}
              >
                <Text className="font-heading-black" style={{ fontSize: 20, color: '#E8650A' }}>{s.value}</Text>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '600', letterSpacing: 0.5, marginTop: 3 }}>{s.sub}</Text>
              </View>
            ))}
          </View>

          <CTAButton
            label="Organise ton premier tournoi"
            onPress={() => router.push(isLoggedIn ? '/(tabs)/tournois/creer' : '/(auth)/register')}
          />
        </LinearGradient>

        {/* 2. AVANTAGES */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <Text className="font-heading-black" style={{ fontSize: 20, color: '#1A2A4A', letterSpacing: -0.5, marginBottom: 16 }}>
            Tout ce qui change pour toi
          </Text>
          <View style={{ gap: 10 }}>
            {AVANTAGES.map((a, i) => {
              const Icon = a.icon;
              return (
                <Animated.View
                  key={a.title}
                  entering={FadeInDown.delay(i * 60).duration(300)}
                  style={{ backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#F0EBE8', padding: 14, flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: a.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={20} color={a.iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text className="font-heading-black" style={{ fontSize: 14, color: '#1A2A4A', marginBottom: 4 }}>{a.title}</Text>
                    <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 19 }}>{a.desc}</Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* 3. LE JOUR DU TOURNOI */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#F0EBE8', padding: 18 }}>
            <Text className="font-heading-black" style={{ fontSize: 16, color: '#1A2A4A', marginBottom: 4 }}>🏆 Le jour du tournoi</Text>
            <Text style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>
              Tu poses ton téléphone. L'app s'occupe du reste.
            </Text>

            {ETAPES.map((e, i) => (
              <View key={e.num} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: e.color, alignItems: 'center', justifyContent: 'center' }}>
                    <Text className="font-heading-black" style={{ fontSize: 15, color: '#fff' }}>{e.num}</Text>
                  </View>
                  {i < ETAPES.length - 1 ? (
                    <View style={{ width: 2, backgroundColor: '#F0EBE8', flex: 1, minHeight: e.badge ? 72 : 48, marginVertical: 4 }} />
                  ) : null}
                </View>
                <View style={{ flex: 1, paddingBottom: i < ETAPES.length - 1 ? 4 : 0 }}>
                  <Text className="font-heading-black" style={{ fontSize: 13, color: '#1A2A4A', marginBottom: 4 }}>{e.title}</Text>
                  <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 19 }}>{e.desc}</Text>
                  {e.badge ? (
                    <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF0E6', borderWidth: 1, borderColor: 'rgba(232,101,10,0.25)', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 5, marginTop: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#E8650A' }}>{e.badge}</Text>
                    </View>
                  ) : null}
                  {i < ETAPES.length - 1 ? <View style={{ height: 16 }} /> : null}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 4. AVANT / APRÈS */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <Text className="font-heading-black" style={{ fontSize: 20, color: '#1A2A4A', letterSpacing: -0.5, marginBottom: 14 }}>
            Avant vs. Maintenant
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <BeforeAfterColumn mode="before" items={AVANT} />
            <BeforeAfterColumn mode="after" items={APRES} />
          </View>
        </View>

        {/* 5. GRATUIT POUR TOUJOURS */}
        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
          <LinearGradient
            colors={['#1A2A4A', '#2A4A6A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 20, padding: 22, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 32, marginBottom: 10 }}>🎾</Text>
            <Text className="font-heading-black" style={{ fontSize: 22, color: '#fff', textAlign: 'center', marginBottom: 10 }}>
              Gratuit.{'\n'}Pour toujours.
            </Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 16, lineHeight: 22 }}>
              Notre modèle économique ne repose pas sur les juges arbitres ni les clubs.
            </Text>
            {GRATUIT.map((f) => (
              <Text key={f} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginBottom: 5 }}>
                ✓ {f}
              </Text>
            ))}
          </LinearGradient>
        </View>

        {/* 6. CTA FINAL */}
        <View style={{ paddingHorizontal: 16, paddingTop: 20, gap: 10 }}>
          {isLoggedIn ? (
            <CTAButton
              label="Créer mon premier tournoi"
              onPress={() => router.push('/(tabs)/tournois/creer')}
            />
          ) : (
            <>
              <CTAButton
                label="Créer mon compte gratuitement"
                onPress={() => router.push('/(auth)/register')}
              />
              <Pressable
                onPress={() => router.push('/(auth)/login')}
                style={{ backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#F0EBE8', borderRadius: 18, paddingVertical: 16, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A2A4A' }}>
                  Teste la création de ton premier tournoi →
                </Text>
              </Pressable>
            </>
          )}
          <Text style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
            Aucune carte bancaire requise · 100% gratuit · Prêt en 5 minutes
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function BeforeAfterColumn({ mode, items }: { mode: 'before' | 'after'; items: string[] }) {
  const isAfter = mode === 'after';
  return (
    <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 18, borderWidth: isAfter ? 2 : 1, borderColor: isAfter ? '#E8650A' : '#F0EBE8', padding: 16 }}>
      <Text style={{ fontSize: 10, fontWeight: '800', color: isAfter ? '#E8650A' : '#ef4444', letterSpacing: 0.8, marginBottom: 12 }}>
        {isAfter ? '✅ AVEC PTP' : '❌ AVANT'}
      </Text>
      {items.map((item) => (
        <View key={item} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: isAfter ? '#E8650A' : '#fca5a5' }}>
            {isAfter ? '✓' : '✕'}
          </Text>
          <Text style={{ fontSize: 11, color: isAfter ? '#1A2A4A' : '#94a3b8', fontWeight: isAfter ? '700' : '400', flex: 1 }}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

function CTAButton({ label, onPress, rightIcon }: { label: string; onPress: () => void; rightIcon?: ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ backgroundColor: '#E8650A', borderRadius: 18, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}
    >
      <Text className="font-heading-black" style={{ fontSize: 16, color: '#fff' }}>{label}</Text>
      {rightIcon ?? <ArrowRight size={20} color="#fff" />}
    </Pressable>
  );
}
