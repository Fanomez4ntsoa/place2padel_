import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircle, ArrowLeft, CheckCircle2, Lock } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { z } from 'zod';

import { Button, Input, Text } from '@/design-system';
import { api, formatApiError } from '@/lib/api';

const schema = z
  .object({
    password: z.string().min(8, 'Au moins 8 caractères').regex(/[A-Za-z]/, 'Au moins une lettre').regex(/[0-9]/, 'Au moins un chiffre'),
    confirm: z.string().min(1, 'Confirmation requise'),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirm'],
  });
type FormValues = z.infer<typeof schema>;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const tokenMissing = !params.token || !params.email;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });

  // Redirige vers login après 3s de succès.
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => router.replace('/(auth)/login'), 3000);
    return () => clearTimeout(t);
  }, [done, router]);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', {
        token: params.token,
        email: params.email,
        password: values.password,
      });
      setDone(true);
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
          <View className="px-6 pb-6 pt-16">
            <Pressable onPress={() => router.back()} className="mb-6 flex-row items-center">
              <ArrowLeft size={18} color="#1A2A4A" />
              <Text variant="caption" className="ml-1 font-heading text-brand-navy">
                Retour
              </Text>
            </Pressable>

            {tokenMissing ? (
              <View className="rounded-3xl border border-red-100 bg-white p-6">
                <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
                  <AlertCircle size={28} color="#DC2626" />
                </View>
                <Text variant="h3" className="text-brand-navy">
                  Lien invalide
                </Text>
                <Text variant="body" className="mt-2 text-brand-text-soft">
                  Ce lien est incomplet ou expiré. Demande un nouveau lien de réinitialisation.
                </Text>
                <Link href="/(auth)/forgot-password" asChild>
                  <Pressable className="mt-6">
                    <Button
                      label="Nouvelle demande"
                      onPress={() => router.replace('/(auth)/forgot-password')}
                    />
                  </Pressable>
                </Link>
              </View>
            ) : done ? (
              <View className="rounded-3xl border border-brand-border bg-white p-6">
                <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-[#F0FDF4]">
                  <CheckCircle2 size={28} color="#15803D" />
                </View>
                <Text variant="h3" className="text-brand-navy">
                  Mot de passe mis à jour !
                </Text>
                <Text variant="body" className="mt-2 text-brand-text-soft">
                  Tu peux te connecter avec ton nouveau mot de passe. Redirection automatique dans 3 secondes.
                </Text>
              </View>
            ) : (
              <>
                <Text variant="h1" className="text-brand-navy">
                  Nouveau mot de passe
                </Text>
                <Text variant="body" className="mt-2 text-brand-text-soft">
                  Choisis un mot de passe solide — au moins 8 caractères, lettres et chiffres.
                </Text>

                <View className="mt-8 rounded-3xl border border-brand-border bg-white p-6">
                  {serverError ? (
                    <View className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-3">
                      <Text variant="caption" className="font-body-medium text-brand-danger">
                        {serverError}
                      </Text>
                    </View>
                  ) : null}

                  <Controller
                    control={control}
                    name="password"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <Input
                        label="Nouveau mot de passe"
                        placeholder="Minimum 8 caractères"
                        secureTextEntry
                        autoCapitalize="none"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        fieldBg="brand"
                        leftIcon={<Lock size={16} color="#94A3B8" />}
                        error={errors.password?.message ?? null}
                      />
                    )}
                  />

                  <Controller
                    control={control}
                    name="confirm"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <Input
                        label="Confirmation"
                        placeholder="Retape ton mot de passe"
                        secureTextEntry
                        autoCapitalize="none"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        fieldBg="brand"
                        leftIcon={<Lock size={16} color="#94A3B8" />}
                        error={errors.confirm?.message ?? null}
                        className="mt-4"
                      />
                    )}
                  />

                  <Button
                    label={submitting ? 'Enregistrement...' : 'Mettre à jour'}
                    onPress={handleSubmit(onSubmit)}
                    loading={submitting}
                    className="mt-5"
                  />
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
