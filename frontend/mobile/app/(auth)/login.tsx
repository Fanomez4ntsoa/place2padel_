import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { ArrowRight, Lock, Mail } from 'lucide-react-native';
import { useState } from 'react';
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
import { formatApiError } from '@/lib/api';

const schema = z.object({
  email: z.string().min(1, 'Email requis').email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});
type FormValues = z.infer<typeof schema>;

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1774600328263-c52a77bd7408?crop=entropy&cs=srgb&fm=jpg&w=800';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fadeHero = useFadeInUp(0);
  const fadeCard = useFadeInUp(150);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      await login(values.email, values.password);
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
          contentContainerClassName="flex-grow"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero — gradient navy bottom-up sur photo padel + titre */}
          <Animated.View style={fadeHero} className="relative h-52 overflow-hidden">
            <Image
              source={HERO_IMAGE}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(26,42,74,0.4)', '#1A2A4A']}
              locations={[0, 0.5, 1]}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <View className="absolute bottom-5 left-6">
              <Text variant="h1" className="text-white">
                Place2Padel
              </Text>
              <Text variant="caption" className="mt-1 text-white/70">
                Connecte-toi pour continuer
              </Text>
            </View>
          </Animated.View>

          {/* Card form — overlap -mt-4 sur le hero */}
          <Animated.View style={fadeCard} className="-mt-4 flex-1 px-6 py-6">
            <View className="rounded-3xl border border-brand-border bg-white p-6">
              {serverError ? (
                <View className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-3">
                  <Text variant="caption" className="font-body-medium text-brand-danger">
                    {serverError}
                  </Text>
                </View>
              ) : null}

              <Controller
                control={control}
                name="email"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Input
                    label="Email"
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
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Input
                    label="Mot de passe"
                    placeholder="Ton mot de passe"
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

              <Button
                label={submitting ? 'Connexion...' : 'Se connecter'}
                onPress={handleSubmit(onSubmit)}
                loading={submitting}
                className="mt-5"
                leftIcon={!submitting ? <ArrowRight size={18} color="#FFFFFF" /> : undefined}
              />

              {/* Séparateur "ou" */}
              <View className="my-5 flex-row items-center">
                <View className="h-px flex-1 bg-brand-border" />
                <Text variant="caption" className="mx-3">
                  ou
                </Text>
                <View className="h-px flex-1 bg-brand-border" />
              </View>

              {/* Google OAuth — Phase 6.2 */}
              <Button
                label="Continuer avec Google"
                variant="ghost"
                disabled
                onPress={() => undefined}
              />
              <Text variant="caption" className="mt-2 text-center">
                Google OAuth disponible en Phase 6.2.
              </Text>

              <View className="mt-5 flex-row items-center justify-center">
                <Text variant="caption">Pas encore de compte ?</Text>
                <Link href="/(auth)/register" asChild>
                  <Pressable>
                    <Text variant="caption" className="ml-1 font-heading text-brand-orange">
                      Inscris-toi
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
