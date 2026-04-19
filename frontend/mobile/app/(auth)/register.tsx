import { zodResolver } from '@hookform/resolvers/zod';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CreditCard,
  Lock,
  Mail,
  MapPin,
  Search,
  User as UserIcon,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { z } from 'zod';

import { AccountRoleCardsList } from '@/components/auth/AccountRoleCards';
import { useAuth } from '@/contexts/AuthContext';
import { Badge, Button, Card, Input, Text } from '@/design-system';
import { useClubsQuickSearch } from '@/features/clubs/useClubs';
import type { AvailabilitySlot } from '@/features/profile/useProfile';
import { SLOT_PRESETS, slotKey, toggleSlotPreset } from '@/features/profile/slots';
import { api, formatApiError } from '@/lib/api';

type AccountType = 'player' | 'referee' | 'club_owner';

interface ClubResult {
  uuid: string;
  name: string;
  city: string;
  postal_code: string | null;
}

/**
 * 5 niveaux alignés sur `UpdateProfileRequest::padel_level` (between:1,5) et
 * `users_profiles.padel_level`. L'échelle 1-10 Emergent est aplatie ici pour
 * éviter le rejet backend silencieux.
 */
const NIVEAUX: { value: number; desc: string }[] = [
  { value: 1, desc: 'Débutant — je découvre le padel' },
  { value: 2, desc: 'Je connais les bases' },
  { value: 3, desc: 'Je joue régulièrement en loisir' },
  { value: 4, desc: 'Joueur confirmé, premiers tournois' },
  { value: 5, desc: 'Compétiteur régulier P25+' },
];

const baseSchema = z.object({
  first_name: z.string().min(1, 'Prénom requis').max(100),
  last_name: z.string().min(1, 'Nom requis').max(100),
  email: z.string().min(1, 'Email requis').email('Email invalide'),
  password: z
    .string()
    .min(8, 'Min. 8 caractères')
    .regex(/[A-Za-z]/, 'Au moins une lettre')
    .regex(/[0-9]/, 'Au moins un chiffre'),
  license_number: z.string().max(50).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  bio: z.string().max(500).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof baseSchema>;

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const params = useLocalSearchParams<{ accountType?: string }>();
  const initialAccountType: AccountType | null =
    params.accountType === 'player' ||
    params.accountType === 'referee' ||
    params.accountType === 'club_owner'
      ? params.accountType
      : null;
  const [accountType, setAccountType] = useState<AccountType | null>(initialAccountType);

  if (!accountType) {
    return <AccountTypeSelector onPick={setAccountType} onBack={() => router.back()} />;
  }

  if (accountType === 'club_owner') {
    return (
      <ClubOwnerForm
        onBack={() => setAccountType(null)}
        onSuccess={(clubUuid) => router.replace(`/clubs/${clubUuid}`)}
        onFallback={() => router.replace('/(tabs)/cockpit')}
        register={register}
      />
    );
  }

  return (
    <RegisterForm
      accountType={accountType}
      onBack={() => setAccountType(null)}
      onSuccess={(u) => {
        // Redirect selon accountType — referee va vers un stub /referee en Phase 6.2,
        // pour l'instant on envoie sur cockpit qui détecte le role.
        router.replace('/(tabs)/cockpit');
        void u;
      }}
      register={register}
    />
  );
}

// ───────────────────────────────────────────────────────────
// Step 1 — Sélecteur accountType (3 cartes chipées, aligné Emergent d5ac086)
// Composant réutilisé depuis CockpitPreview via AccountRoleCardsList.
// ───────────────────────────────────────────────────────────
function AccountTypeSelector({
  onPick,
  onBack,
}: {
  onPick: (t: AccountType) => void;
  onBack: () => void;
}) {
  return (
    <View className="flex-1 bg-brand-bg">
      <ScrollView contentContainerClassName="flex-grow">
        <LinearGradient
          colors={['#1A2A4A', '#2A4A6A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}
        >
          <Pressable onPress={onBack} hitSlop={8} className="mb-2">
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>
          <Text className="font-heading-black text-white" style={{ fontSize: 20 }}>
            Rejoins PlaceToPadel 🎾
          </Text>
          <Text className="mt-0.5 text-white/60" style={{ fontSize: 11 }}>
            Choisis ton profil pour commencer
          </Text>
        </LinearGradient>

        <AccountRoleCardsList onPick={onPick} />
      </ScrollView>
    </View>
  );
}

// ───────────────────────────────────────────────────────────
// Step 2 — Formulaire (player | referee)
// ───────────────────────────────────────────────────────────
function RegisterForm({
  accountType,
  onBack,
  onSuccess,
  register,
}: {
  accountType: AccountType;
  onBack: () => void;
  onSuccess: (user: unknown) => void;
  register: (p: Record<string, unknown>) => Promise<unknown>;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Champs spécifiques joueur hors RHF pour simplicité (grilles + slider).
  const [position, setPosition] = useState<'left' | 'right' | 'both' | null>(null);
  const [niveau, setNiveau] = useState<number>(0);
  // Availabilities — tuples {day_of_week, period} alignés backend (10 presets max,
  // Flexible exclusif). Format `AvailabilitySlot[]` pour envoi direct au register.
  const [availabilities, setAvailabilities] = useState<AvailabilitySlot[]>([]);
  const [radius, setRadius] = useState<number>(50);

  const [clubQuery, setClubQuery] = useState('');
  const [clubResults, setClubResults] = useState<ClubResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedClub, setSelectedClub] = useState<ClubResult | null>(null);
  // Clubs secondaire & tertiaire (priority 2 & 3) — port parité Emergent d5ac086.
  const [selectedClub2, setSelectedClub2] = useState<ClubResult | null>(null);
  const [selectedClub3, setSelectedClub3] = useState<ClubResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      license_number: '',
      city: '',
      bio: '',
    },
  });

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (clubQuery.length < 2) {
      setClubResults([]);
      setShowResults(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/clubs/search', { params: { q: clubQuery } });
        setClubResults(((data?.data ?? []) as ClubResult[]).slice(0, 6));
        setShowResults(true);
      } catch {
        setClubResults([]);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [clubQuery]);

  const pickClub = (club: ClubResult) => {
    setSelectedClub(club);
    setClubQuery(club.name);
    setShowResults(false);
    setValue('city', club.city, { shouldValidate: false });
  };

  const onSubmit = async (values: FormValues) => {
    // Validations player-only.
    if (accountType === 'player') {
      if (!position) {
        setServerError('Ton côté de jeu est obligatoire.');
        return;
      }
      if (!niveau) {
        setServerError('Ton niveau est obligatoire.');
        return;
      }
      if (availabilities.length === 0) {
        setServerError('Indique au moins une disponibilité.');
        return;
      }
      if (!selectedClub) {
        setServerError('Ton club principal est obligatoire.');
        return;
      }
    }
    setServerError(null);
    setSubmitting(true);

    // Construit l'array clubs ordonné (priority 1..3). `selectedClub` sert
    // toujours au referee (club_uuid legacy) ; pour le player on part sur
    // `clubs` array qui prime backend-side.
    const clubsOrdered: string[] = [selectedClub, selectedClub2, selectedClub3]
      .filter((c): c is ClubResult => !!c)
      .map((c) => c.uuid);

    try {
      await register({
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        password: values.password,
        license_number: values.license_number || undefined,
        city: values.city || undefined,
        bio: accountType === 'player' && values.bio ? values.bio : undefined,
        // Player → clubs[] (1 à 3). Referee/autre → club_uuid legacy singleton.
        ...(accountType === 'player'
          ? { clubs: clubsOrdered.length > 0 ? clubsOrdered : undefined }
          : { club_uuid: selectedClub?.uuid ?? undefined }),
        max_radius_km: accountType === 'player' ? radius : undefined,
        role: accountType,
        position: accountType === 'player' ? position : undefined,
        padel_level: accountType === 'player' ? niveau : undefined,
        availabilities: accountType === 'player' ? availabilities : undefined,
      });
      onSuccess(undefined);
    } catch (err) {
      setServerError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const niveauActif = NIVEAUX.find((n) => n.value === niveau);

  return (
    <View className="flex-1 bg-brand-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="pb-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={['#1A2A4A', '#2A4A6A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 }}
          >
            <Pressable onPress={onBack} hitSlop={8}>
              <ArrowLeft size={22} color="#FFFFFF" />
            </Pressable>
            <View className="mt-3">
              <Text variant="caption" className="text-white/60">
                {accountType === 'player' ? 'Compte joueur' : 'Compte juge arbitre'}
              </Text>
              <Text variant="h2" className="mt-1 text-white">
                Crée ton profil
              </Text>
            </View>
          </LinearGradient>

          <View className="-mt-3 px-5 py-4">
            <Card>
              {serverError ? (
                <View className="mb-3 rounded-2xl border border-red-100 bg-red-50 p-3">
                  <Text variant="caption" className="font-body-medium text-brand-danger">
                    {serverError}
                  </Text>
                </View>
              ) : null}

              {/* Noms */}
              <View className="flex-row gap-2">
                <Controller
                  control={control}
                  name="first_name"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <Input
                      label="PRÉNOM *"
                      placeholder="Prénom"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      fieldBg="brand"
                      leftIcon={<UserIcon size={14} color="#94A3B8" />}
                      error={errors.first_name?.message ?? null}
                      className="flex-1"
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="last_name"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <Input
                      label="NOM *"
                      placeholder="Nom"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      fieldBg="brand"
                      leftIcon={<UserIcon size={14} color="#94A3B8" />}
                      error={errors.last_name?.message ?? null}
                      className="flex-1"
                    />
                  )}
                />
              </View>

              <Controller
                control={control}
                name="email"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Input
                    label="EMAIL *"
                    placeholder="ton@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    fieldBg="brand"
                    leftIcon={<Mail size={14} color="#94A3B8" />}
                    error={errors.email?.message ?? null}
                    className="mt-3"
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Input
                    label="MOT DE PASSE *"
                    placeholder="Min. 8 caractères, lettres + chiffres"
                    secureTextEntry
                    autoCapitalize="none"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    fieldBg="brand"
                    leftIcon={<Lock size={14} color="#94A3B8" />}
                    error={errors.password?.message ?? null}
                    className="mt-3"
                  />
                )}
              />

              {/* Champs spécifiques joueur */}
              {accountType === 'player' ? (
                <>
                  {/* Position */}
                  <View className="mt-4">
                    <Text variant="caption" className="font-body-medium uppercase tracking-wider text-brand-orange text-[10px]">
                      Côté de jeu *
                    </Text>
                    <Text variant="caption" className="mb-2 text-[10px]">
                      Utilisé pour le matching partenaire
                    </Text>
                    <View className="flex-row gap-2">
                      {[
                        { value: 'left' as const, label: 'Gauche ▶' },
                        { value: 'both' as const, label: '↔ Les deux' },
                        { value: 'right' as const, label: '◀ Droite' },
                      ].map(({ value: v, label }) => {
                        const active = position === v;
                        return (
                          <Pressable
                            key={v}
                            onPress={() => setPosition(v)}
                            className={`flex-1 items-center rounded-xl border-2 py-3 ${
                              active
                                ? 'border-brand-orange bg-brand-orange-light'
                                : 'border-brand-border bg-white'
                            }`}
                          >
                            <Text
                              variant="caption"
                              className={`font-heading text-[12px] ${active ? 'text-brand-orange' : 'text-brand-navy'}`}
                            >
                              {label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {/* Niveau 1-10 */}
                  <View className="mt-4">
                    <Text variant="caption" className="font-body-medium uppercase tracking-wider text-brand-orange text-[10px]">
                      Ton niveau *
                    </Text>
                    <Text variant="caption" className="mb-2 text-[10px]">
                      Sois honnête — ça améliore la qualité des matchs
                    </Text>
                    <View className="flex-row flex-wrap gap-1.5">
                      {NIVEAUX.map(({ value }) => {
                        const active = niveau === value;
                        return (
                          <Pressable
                            key={value}
                            onPress={() => setNiveau(value)}
                            className={`h-10 w-[18%] items-center justify-center rounded-xl border-2 ${
                              active
                                ? 'border-brand-orange bg-brand-orange'
                                : 'border-brand-border bg-white'
                            }`}
                          >
                            <Text
                              variant="caption"
                              className={`font-heading-black text-[16px] ${active ? 'text-white' : 'text-brand-navy'}`}
                            >
                              {value}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <View className={`mt-2 rounded-xl px-3 py-2 ${niveauActif ? 'bg-brand-orange-light' : 'bg-slate-50'}`}>
                      <Text variant="caption" className={niveauActif ? 'text-brand-orange font-body-medium' : 'text-brand-muted'}>
                        {niveauActif
                          ? `Niveau ${niveauActif.value} — ${niveauActif.desc}`
                          : 'Sélectionne un niveau pour voir la description'}
                      </Text>
                    </View>
                  </View>

                  {/* Disponibilités — 10 presets alignés backend (tuples {day, period}) */}
                  <View className="mt-4">
                    <Text variant="caption" className="font-body-medium uppercase tracking-wider text-brand-orange text-[10px]">
                      Tes disponibilités *
                    </Text>
                    <Text variant="caption" className="mb-2 text-[10px]">
                      Choisis tes créneaux habituels. &quot;Flexible&quot; désélectionne les autres.
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {SLOT_PRESETS.map((preset) => {
                        const active = availabilities.some(
                          (s) => slotKey(s) === `${preset.day_of_week ?? 'null'}:${preset.period}`,
                        );
                        const isFlex = preset.day_of_week === null;
                        const activeBg = isFlex ? 'border-brand-navy bg-brand-navy' : 'border-brand-orange bg-brand-orange';
                        return (
                          <Pressable
                            key={preset.key}
                            onPress={() =>
                              setAvailabilities((prev) => toggleSlotPreset(prev, preset))
                            }
                            className={`rounded-full border-2 px-3 py-1.5 ${
                              active ? activeBg : 'border-brand-border bg-white'
                            }`}
                          >
                            <Text
                              variant="caption"
                              className={`font-heading text-[11px] ${active ? 'text-white' : 'text-brand-navy'}`}
                            >
                              {preset.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {availabilities.length > 0 ? (
                      <Text variant="caption" className="mt-1 font-body-medium text-brand-success">
                        ✅ {availabilities.length} créneau{availabilities.length > 1 ? 'x' : ''} sélectionné{availabilities.length > 1 ? 's' : ''}
                      </Text>
                    ) : null}
                  </View>
                </>
              ) : null}

              {/* Club principal (player requis, referee optionnel) */}
              <View className="mt-4">
                <Input
                  label={
                    accountType === 'player' ? 'CLUB PRINCIPAL *' : 'CLUB (OPTIONNEL)'
                  }
                  placeholder="Cherche ton club..."
                  value={clubQuery}
                  onChangeText={(t) => {
                    setClubQuery(t);
                    if (selectedClub && t !== selectedClub.name) setSelectedClub(null);
                  }}
                  fieldBg="brand"
                  leftIcon={<Search size={14} color="#94A3B8" />}
                />
                {showResults && clubResults.length > 0 ? (
                  <View className="mt-1 overflow-hidden rounded-2xl border border-brand-border bg-white">
                    {clubResults.map((c, idx) => (
                      <Pressable
                        key={c.uuid}
                        onPress={() => pickClub(c)}
                        className={`px-4 py-2.5 ${idx < clubResults.length - 1 ? 'border-b border-brand-border' : ''}`}
                      >
                        <Text variant="caption" className="font-body-medium text-brand-navy">
                          {c.name}
                        </Text>
                        <Text variant="caption">
                          {c.city}
                          {c.postal_code ? ` (${c.postal_code})` : ''}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                {selectedClub ? (
                  <Text variant="caption" className="mt-1 font-body-medium text-brand-success">
                    ✅ {selectedClub.name} — {selectedClub.city}
                  </Text>
                ) : null}
              </View>

              {/* Clubs secondaire & tertiaire — player uniquement, optionnels */}
              {accountType === 'player' ? (
                <>
                  <SecondaryClubPicker
                    label="CLUB SECONDAIRE (OPTIONNEL)"
                    current={selectedClub2}
                    onPick={setSelectedClub2}
                    onRemove={() => setSelectedClub2(null)}
                    excludeUuids={[selectedClub?.uuid, selectedClub3?.uuid].filter(
                      (u): u is string => !!u,
                    )}
                  />
                  <SecondaryClubPicker
                    label="CLUB TERTIAIRE (OPTIONNEL)"
                    current={selectedClub3}
                    onPick={setSelectedClub3}
                    onRemove={() => setSelectedClub3(null)}
                    excludeUuids={[selectedClub?.uuid, selectedClub2?.uuid].filter(
                      (u): u is string => !!u,
                    )}
                  />
                </>
              ) : null}

              {/* Ville */}
              <Controller
                control={control}
                name="city"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Input
                    label="VILLE"
                    placeholder="Ex : Agde"
                    value={value ?? ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    fieldBg="brand"
                    leftIcon={<MapPin size={14} color="#94A3B8" />}
                    className="mt-3"
                  />
                )}
              />

              {/* Rayon */}
              {accountType === 'player' ? (
                <View className="mt-4">
                  <Text variant="caption" className="font-body-medium uppercase tracking-wider text-brand-navy text-[10px]">
                    Zone de déplacement tournois : {radius} km
                  </Text>
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    {[10, 30, 50, 100, 200].map((r) => {
                      const active = radius === r;
                      return (
                        <Pressable
                          key={r}
                          onPress={() => setRadius(r)}
                          className={`rounded-full border px-3 py-1 ${
                            active ? 'border-brand-orange bg-brand-orange' : 'border-brand-border bg-white'
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
                  </View>
                </View>
              ) : null}

              {/* Bio */}
              <View className="mt-4">
                <Text variant="caption" className="mb-1.5 font-body-medium uppercase tracking-wider text-brand-navy text-[10px]">
                  À propos
                </Text>
                <Controller
                  control={control}
                  name="bio"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <TextInput
                      multiline
                      value={value ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Ex : Joueur régulier, bon esprit, je cherche un partenaire sérieux..."
                      placeholderTextColor="#94A3B8"
                      className="min-h-[80px] rounded-2xl border border-brand-border bg-brand-bg p-3 font-body text-[15px] text-brand-navy"
                      style={{ textAlignVertical: 'top' }}
                    />
                  )}
                />
              </View>

              {/* Licence */}
              <Controller
                control={control}
                name="license_number"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Input
                    label="LICENCE FFT (OPTIONNEL)"
                    placeholder="Ex : 1234567"
                    value={value ?? ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    fieldBg="brand"
                    leftIcon={<CreditCard size={14} color="#E8650A" />}
                    className="mt-4"
                  />
                )}
              />
              <Text variant="caption" className="mt-1 text-[10px]">
                Optionnel à l'inscription · Requis pour s'inscrire aux tournois
              </Text>

              <Button
                label={submitting ? 'Inscription...' : 'Créer mon compte'}
                onPress={handleSubmit(onSubmit)}
                loading={submitting}
                className="mt-5"
                leftIcon={!submitting ? <ArrowRight size={18} color="#FFFFFF" /> : undefined}
              />

              <View className="mt-4 flex-row items-center justify-center">
                <Text variant="caption">Déjà un compte ?</Text>
                <Link href="/(auth)/login" asChild>
                  <Pressable>
                    <Text variant="caption" className="ml-1 font-heading text-brand-orange">
                      Connecte-toi
                    </Text>
                  </Pressable>
                </Link>
              </View>

              {accountType === 'player' ? (
                <View className="mt-3 items-center">
                  <Badge label="Compte joueur" tone="info" />
                </View>
              ) : (
                <View className="mt-3 items-center">
                  <Badge label="Compte juge arbitre" tone="neutral" />
                </View>
              )}
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ───────────────────────────────────────────────────────────
// Club owner — register + claim club post-création
// ───────────────────────────────────────────────────────────
const clubOwnerSchema = z.object({
  first_name: z.string().min(1, 'Prénom requis').max(100),
  last_name: z.string().min(1, 'Nom requis').max(100),
  email: z.string().min(1, 'Email requis').email('Email invalide'),
  password: z
    .string()
    .min(8, 'Min. 8 caractères')
    .regex(/[A-Za-z]/, 'Au moins une lettre')
    .regex(/[0-9]/, 'Au moins un chiffre'),
  city: z.string().max(100).optional().or(z.literal('')),
  bio: z.string().max(500).optional().or(z.literal('')),
});
type ClubOwnerFormValues = z.infer<typeof clubOwnerSchema>;

function ClubOwnerForm({
  onBack,
  onSuccess,
  onFallback,
  register,
}: {
  onBack: () => void;
  onSuccess: (clubUuid: string) => void;
  onFallback: () => void;
  register: (p: Record<string, unknown>) => Promise<unknown>;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [clubType, setClubType] = useState<'associatif' | 'prive' | null>(null);

  const [clubQuery, setClubQuery] = useState('');
  const [clubResults, setClubResults] = useState<ClubResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedClub, setSelectedClub] = useState<ClubResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ClubOwnerFormValues>({
    resolver: zodResolver(clubOwnerSchema),
    defaultValues: { first_name: '', last_name: '', email: '', password: '', city: '', bio: '' },
  });

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (clubQuery.length < 2) {
      setClubResults([]);
      setShowResults(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/clubs/search', { params: { q: clubQuery } });
        setClubResults(((data?.data ?? []) as ClubResult[]).slice(0, 6));
        setShowResults(true);
      } catch {
        setClubResults([]);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [clubQuery]);

  const pickClub = (club: ClubResult) => {
    setSelectedClub(club);
    setClubQuery(club.name);
    setShowResults(false);
    setValue('city', club.city, { shouldValidate: false });
  };

  const onSubmit = async (values: ClubOwnerFormValues) => {
    if (!selectedClub) {
      setServerError('Sélectionne ton club dans la liste.');
      return;
    }
    if (!clubType) {
      setServerError('Indique si ton club est associatif ou privé.');
      return;
    }
    setServerError(null);
    setSubmitting(true);
    try {
      await register({
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        password: values.password,
        city: values.city || undefined,
        // Description du club — persistée sur user_profiles.bio au register
        // et récupérable plus tard pour alimenter clubs.description via /clubs/claim.
        bio: values.bio || undefined,
        role: 'club_owner',
      });

      // Une fois inscrit, l'intercepteur a stocké l'access_token → /clubs/claim part authentifié.
      try {
        const { data } = await api.post('/clubs/claim', {
          club_uuid: selectedClub.uuid,
          club_type: clubType,
        });
        const clubUuid = (data?.data?.uuid ?? selectedClub.uuid) as string;
        onSuccess(clubUuid);
      } catch {
        // Claim raté (ex: club déjà revendiqué) — on ne bloque pas l'inscription,
        // on redirige vers cockpit qui affichera ses pages.
        onFallback();
      }
    } catch (err) {
      setServerError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-brand-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={['#1A2A4A', '#2A4A6A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingHorizontal: 24, paddingTop: 48, paddingBottom: 28 }}
          >
            <Pressable onPress={onBack} hitSlop={8}>
              <ArrowLeft size={22} color="#FFFFFF" />
            </Pressable>
            <View className="mt-3 flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <Building2 size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text variant="h2" className="text-white">
                  Compte Patron de club
                </Text>
                <Text variant="caption" className="text-white/60">
                  Prends la main sur ta page club
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View className="px-5 py-5">
            <Card>
              {serverError ? (
                <View className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-3">
                  <Text variant="caption" className="font-body-medium text-brand-danger">
                    {serverError}
                  </Text>
                </View>
              ) : null}

              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Controller
                    control={control}
                    name="first_name"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <Input
                        label="Prénom *"
                        placeholder="Prénom"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        fieldBg="brand"
                        error={errors.first_name?.message ?? null}
                      />
                    )}
                  />
                </View>
                <View className="flex-1">
                  <Controller
                    control={control}
                    name="last_name"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <Input
                        label="Nom *"
                        placeholder="Nom"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        fieldBg="brand"
                        error={errors.last_name?.message ?? null}
                      />
                    )}
                  />
                </View>
              </View>

              <Controller
                control={control}
                name="email"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Input
                    label="Email *"
                    placeholder="ton@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    fieldBg="brand"
                    leftIcon={<Mail size={16} color="#94A3B8" />}
                    error={errors.email?.message ?? null}
                    className="mt-4"
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Input
                    label="Mot de passe *"
                    placeholder="Minimum 8 caractères"
                    secureTextEntry
                    autoCapitalize="none"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    fieldBg="brand"
                    leftIcon={<Lock size={16} color="#94A3B8" />}
                    error={errors.password?.message ?? null}
                    className="mt-4"
                  />
                )}
              />

              <View className="mt-5 rounded-2xl border border-brand-orange/30 bg-brand-orange-light p-4">
                <View className="mb-2 flex-row items-center gap-2">
                  <Building2 size={14} color="#E8650A" />
                  <Text className="font-heading text-[13px] text-brand-navy">Ton club *</Text>
                </View>

                <Text
                  variant="caption"
                  className="mb-1.5 font-heading text-[10px] uppercase tracking-wider text-brand-orange"
                >
                  Cherche ton club
                </Text>
                <View className="flex-row items-center gap-2 rounded-xl border border-brand-border bg-white px-3 py-2">
                  <Search size={14} color="#94A3B8" />
                  <TextInput
                    value={clubQuery}
                    onChangeText={(t) => {
                      setClubQuery(t);
                      if (selectedClub && t !== selectedClub.name) setSelectedClub(null);
                    }}
                    placeholder="Nom du club ou ville..."
                    placeholderTextColor="#94A3B8"
                    className="flex-1 text-brand-navy"
                  />
                </View>

                {showResults && clubResults.length > 0 ? (
                  <View className="mt-2 gap-1.5">
                    {clubResults.map((club) => (
                      <Pressable
                        key={club.uuid}
                        onPress={() => pickClub(club)}
                        className="rounded-xl border border-brand-border bg-white px-3 py-2"
                      >
                        <Text className="font-heading text-[13px] text-brand-navy">{club.name}</Text>
                        <Text variant="caption" className="text-[11px]">
                          {club.city}
                          {club.postal_code ? ` (${club.postal_code})` : ''}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                {selectedClub ? (
                  <View className="mt-2 rounded-xl border border-green-200 bg-white p-3">
                    <Text
                      variant="caption"
                      className="font-heading text-[10px] uppercase tracking-wider text-green-700"
                    >
                      ✓ Club sélectionné
                    </Text>
                    <Text className="mt-1 font-heading text-[13px] text-brand-navy">
                      {selectedClub.name}
                    </Text>
                    <Text variant="caption" className="text-[11px]">
                      {selectedClub.city}
                      {selectedClub.postal_code ? ` (${selectedClub.postal_code})` : ''}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text
                variant="caption"
                className="mb-1.5 mt-5 font-heading text-[10px] uppercase tracking-wider text-brand-navy"
              >
                Type de club *
              </Text>
              <View className="flex-row gap-2">
                {(
                  [
                    { value: 'associatif', label: 'Associatif', sub: 'Loi 1901 / ASSO', emoji: '🤝' },
                    { value: 'prive', label: 'Privé', sub: 'Entreprise / SARL / SAS', emoji: '🏢' },
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
                      <Text variant="caption" className="text-[10px]">
                        {opt.sub}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Controller
                control={control}
                name="city"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Input
                    label="Ville"
                    placeholder="Ville du club"
                    value={value ?? ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    fieldBg="brand"
                    leftIcon={<MapPin size={16} color="#94A3B8" />}
                    className="mt-5"
                  />
                )}
              />

              {/* Description du club — port Emergent d5ac086 (textarea 3 lignes). */}
              <View className="mt-5">
                <Text
                  className="mb-1.5 font-heading text-[10px] uppercase tracking-wider text-brand-navy"
                >
                  Description du club
                </Text>
                <Controller
                  control={control}
                  name="bio"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <TextInput
                      value={value ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Présente ton club — courts, ambiance, événements..."
                      placeholderTextColor="#94A3B8"
                      multiline
                      numberOfLines={3}
                      maxLength={500}
                      style={{ textAlignVertical: 'top', minHeight: 72 }}
                      className="rounded-2xl border border-brand-border bg-brand-bg px-3 py-2 font-body text-[14px] text-brand-navy"
                    />
                  )}
                />
              </View>

              <View className="mt-5 rounded-2xl border border-green-200 bg-[#F0FDF4] p-3">
                <Text variant="caption" className="text-[11px] text-[#15803D]">
                  ✅ Ton club sera associé à ton compte dès l&apos;inscription. Les joueurs pourront
                  te suivre et tes tournois apparaîtront sur ta page.
                </Text>
              </View>

              <Button
                label={submitting ? 'Création...' : 'Créer mon compte club'}
                onPress={handleSubmit(onSubmit)}
                loading={submitting}
                className="mt-5"
                leftIcon={!submitting ? <ArrowRight size={18} color="#FFFFFF" /> : undefined}
              />

              <View className="mt-4 flex-row items-center justify-center">
                <Text variant="caption">Déjà un compte ?</Text>
                <Link href="/(auth)/login" asChild>
                  <Pressable>
                    <Text variant="caption" className="ml-1 font-heading text-brand-orange">
                      Connecte-toi
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ───────────────────────────────────────────────────────────
// Club picker secondaire/tertiaire — autocomplete via useClubsQuickSearch.
// Affiche dropdown si q>=2 chars ; card verte quand sélectionné (X reset).
// Utilisé côté player pour les priorities 2 & 3.
// ───────────────────────────────────────────────────────────
function SecondaryClubPicker({
  label,
  current,
  onPick,
  onRemove,
  excludeUuids,
}: {
  label: string;
  current: ClubResult | null;
  onPick: (club: ClubResult) => void;
  onRemove: () => void;
  excludeUuids: string[];
}) {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data: results = [], isFetching } = useClubsQuickSearch(debounced);
  const visible = results
    .filter((c) => !excludeUuids.includes(c.uuid))
    .slice(0, 6);

  if (current) {
    return (
      <View className="mt-3">
        <Text
          variant="caption"
          className="font-body-medium uppercase tracking-wider text-brand-navy text-[10px]"
        >
          {label}
        </Text>
        <View className="mt-1 flex-row items-center justify-between rounded-2xl border border-green-200 bg-[#F0FDF4] px-3 py-2">
          <View className="flex-1">
            <Text variant="caption" className="font-heading text-[13px] text-brand-navy">
              ✅ {current.name}
            </Text>
            <Text variant="caption" className="text-[11px]">
              {current.city}
              {current.postal_code ? ` (${current.postal_code})` : ''}
            </Text>
          </View>
          <Pressable onPress={onRemove} hitSlop={8} className="px-2">
            <Text className="font-heading text-[14px] text-brand-danger">✕</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="mt-3">
      <Input
        label={label}
        placeholder="Cherche un club..."
        value={q}
        onChangeText={(t) => {
          setQ(t);
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => setOpen(true)}
        fieldBg="brand"
        leftIcon={<Search size={14} color="#94A3B8" />}
      />
      {open && debounced.length >= 2 ? (
        <View className="mt-1 overflow-hidden rounded-2xl border border-brand-border bg-white">
          {isFetching ? (
            <View className="px-4 py-3">
              <Text variant="caption" className="text-brand-muted">
                Recherche en cours…
              </Text>
            </View>
          ) : visible.length === 0 ? (
            <View className="px-4 py-3">
              <Text variant="caption" className="text-brand-muted">
                Aucun club trouvé
              </Text>
            </View>
          ) : (
            visible.map((c, idx) => (
              <Pressable
                key={c.uuid}
                onPress={() => {
                  onPick({
                    uuid: c.uuid,
                    name: c.name,
                    city: c.city,
                    postal_code: c.postal_code ?? null,
                  });
                  setQ('');
                  setOpen(false);
                }}
                className={`px-4 py-2.5 ${
                  idx < visible.length - 1 ? 'border-b border-brand-border' : ''
                }`}
              >
                <Text variant="caption" className="font-body-medium text-brand-navy">
                  {c.name}
                </Text>
                <Text variant="caption">
                  {c.city}
                  {c.postal_code ? ` (${c.postal_code})` : ''}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}
