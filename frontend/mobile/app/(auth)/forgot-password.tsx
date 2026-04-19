import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { z } from 'zod';

import { Button, Input, Text } from '@/design-system';
import { api, formatApiError } from '@/lib/api';

const schema = z.object({
  email: z.string().min(1, 'Email requis').email('Email invalide'),
});
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email: values.email.trim().toLowerCase() });
      setSent(true);
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

            <Text variant="h1" className="text-brand-navy">
              Mot de passe oublié ?
            </Text>
            <Text variant="body" className="mt-2 text-brand-text-soft">
              Entre ton email — on t&apos;envoie un lien pour en choisir un nouveau.
            </Text>

            {sent ? (
              <View className="mt-8 rounded-3xl border border-brand-border bg-white p-6">
                <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-[#F0FDF4]">
                  <CheckCircle2 size={28} color="#15803D" />
                </View>
                <Text variant="h3" className="text-brand-navy">
                  Email envoyé !
                </Text>
                <Text variant="body" className="mt-2 text-brand-text-soft">
                  Si <Text className="font-heading text-brand-navy">{getValues('email')}</Text> correspond à un
                  compte, tu recevras un lien dans les prochaines minutes. Pense à vérifier tes
                  spams.
                </Text>
                <Link href="/(auth)/login" asChild>
                  <Pressable className="mt-6">
                    <Button label="Retour à la connexion" onPress={() => router.replace('/(auth)/login')} />
                  </Pressable>
                </Link>
              </View>
            ) : (
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

                <Button
                  label={submitting ? 'Envoi...' : 'Envoyer le lien'}
                  onPress={handleSubmit(onSubmit)}
                  loading={submitting}
                  className="mt-5"
                />

                <View className="mt-4 flex-row items-center justify-center">
                  <Text variant="caption">Tu te souviens ?</Text>
                  <Link href="/(auth)/login" asChild>
                    <Pressable>
                      <Text variant="caption" className="ml-1 font-heading text-brand-orange">
                        Retour à la connexion
                      </Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
