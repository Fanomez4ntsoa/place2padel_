import { zodResolver } from '@hookform/resolvers/zod';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { ArrowRight, CreditCard, Lock, Mail, MapPin, Search, User } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { z } from 'zod';

import { useAuth } from '@/contexts/AuthContext';
import { Button, Input, Text, useFadeInUp } from '@/design-system';
import { api, formatApiError } from '@/lib/api';

/** Backend exige password ≥ 8 + lettres + chiffres. */
const schema = z.object({
  first_name: z.string().min(1, 'Prénom requis').max(100),
  last_name: z.string().min(1, 'Nom requis').max(100),
  email: z.string().min(1, 'Email requis').email('Email invalide'),
  password: z
    .string()
    .min(8, 'Mot de passe minimum 8 caractères')
    .regex(/[A-Za-z]/, 'Au moins une lettre')
    .regex(/[0-9]/, 'Au moins un chiffre'),
  license_number: z.string().max(50).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
});
type FormValues = z.infer<typeof schema>;

interface ClubResult {
  uuid: string;
  name: string;
  city: string;
  postal_code: string | null;
}

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Club autocomplete — état hors react-hook-form (clubQuery texte affiché, selectedClub = sélection validée).
  const [clubQuery, setClubQuery] = useState('');
  const [clubResults, setClubResults] = useState<ClubResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedClub, setSelectedClub] = useState<ClubResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fadeHero = useFadeInUp(0);
  const fadeCard = useFadeInUp(120);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      license_number: '',
      city: '',
    },
  });

  // Debounce 250ms sur la recherche club. Réinitialise la sélection si l'user modifie le texte.
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
        const list = (data?.data ?? []) as ClubResult[];
        setClubResults(list.slice(0, 8));
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

  const onClubQueryChange = (t: string) => {
    setClubQuery(t);
    if (selectedClub && t !== selectedClub.name) {
      setSelectedClub(null);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      await register({
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        password: values.password,
        license_number: values.license_number || undefined,
        city: values.city || undefined,
        club_uuid: selectedClub?.uuid ?? undefined,
        role: 'player',
      });
      router.replace('/(tabs)/cockpit');
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
          contentContainerClassName="flex-grow pb-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero — gradient navy diagonal + titre */}
          <Animated.View style={fadeHero} className="relative h-36 overflow-hidden">
            <LinearGradient
              colors={['#1A2A4A', '#2A4A6A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <View className="absolute bottom-4 left-6">
              <Text variant="h2" className="text-white">
                Rejoins la communauté
              </Text>
              <Text variant="caption" className="mt-1 text-white/70">
                Crée ton compte en quelques secondes
              </Text>
            </View>
          </Animated.View>

          {/* Card form */}
          <Animated.View style={fadeCard} className="-mt-3 px-5 py-4">
            <View className="rounded-3xl border border-brand-border bg-white p-5">
              {serverError ? (
                <View className="mb-3 rounded-2xl border border-red-100 bg-red-50 p-3">
                  <Text variant="caption" className="font-body-medium text-brand-danger">
                    {serverError}
                  </Text>
                </View>
              ) : null}

              {/* Prénom + Nom — 2 cols */}
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
                      leftIcon={<User size={14} color="#94A3B8" />}
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
                      leftIcon={<User size={14} color="#94A3B8" />}
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
                    autoComplete="email"
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
                    error={errors.license_number?.message ?? null}
                    className="mt-3"
                  />
                )}
              />

              {/* Club — autocomplete (état hors RHF) */}
              <View className="mt-3">
                <Input
                  label="CLUB DE PADEL"
                  placeholder="Cherche ton club..."
                  value={clubQuery}
                  onChangeText={onClubQueryChange}
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
                    {selectedClub.name} — {selectedClub.city}
                  </Text>
                ) : null}
              </View>

              {/* Ville — auto-remplie au pick club, éditable */}
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
                    error={errors.city?.message ?? null}
                    className="mt-3"
                  />
                )}
              />

              <Button
                label={submitting ? 'Inscription...' : 'Créer mon compte'}
                onPress={handleSubmit(onSubmit)}
                loading={submitting}
                className="mt-5"
                leftIcon={!submitting ? <ArrowRight size={18} color="#FFFFFF" /> : undefined}
              />

              <View className="my-4 flex-row items-center">
                <View className="h-px flex-1 bg-brand-border" />
                <Text variant="caption" className="mx-3">
                  ou
                </Text>
                <View className="h-px flex-1 bg-brand-border" />
              </View>

              <Button
                label="Continuer avec Google"
                variant="ghost"
                disabled
                onPress={() => undefined}
              />
              <Text variant="caption" className="mt-2 text-center">
                Google OAuth disponible en Phase 6.2.
              </Text>

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
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
