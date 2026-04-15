import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Pencil, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { Badge, Button, Card, Input, Text } from '@/design-system';
import { formatApiError } from '@/lib/api';
import { useProfile, useUpdateProfile } from '@/features/profile/useProfile';

const DAY_LABELS = ['', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const POSITION_LABELS: Record<string, string> = {
  left: 'Gauche',
  right: 'Droite',
  both: 'Les deux',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const { data: profile, isLoading } = useProfile(id);
  const updateMut = useUpdateProfile(id);

  const isSelf = !!user && user.uuid === id;
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');

  useEffect(() => {
    if (profile) {
      setBio(profile.profile?.bio ?? '');
      setCity(profile.city ?? '');
    }
  }, [profile]);

  if (isLoading || !profile) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 items-center justify-center bg-brand-bg">
        <ActivityIndicator color="#E8650A" />
      </SafeAreaView>
    );
  }

  const initials = (profile.name || '?').trim().charAt(0).toUpperCase();

  const handleSave = async () => {
    try {
      await updateMut.mutateAsync({ bio: bio.trim(), city: city.trim() });
      setEditing(false);
    } catch (err) {
      Alert.alert('Erreur', formatApiError(err));
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-brand-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pb-2 pt-3">
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full"
            hitSlop={8}
          >
            <ArrowLeft size={20} color="#1A2A4A" />
          </Pressable>
          {isSelf ? (
            <Pressable
              onPress={() => setEditing(true)}
              className="h-9 w-9 items-center justify-center rounded-full"
              hitSlop={8}
            >
              <Pencil size={18} color="#1A2A4A" />
            </Pressable>
          ) : (
            <View className="h-9 w-9" />
          )}
        </View>

        {/* Identité compacte — port d541157 (pas de cover, header plat) */}
        <View className="px-6 pt-2">
          <View className="flex-row items-start gap-4">
            <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-2 border-brand-border bg-white">
              <Text variant="h1" className="text-brand-orange">{initials}</Text>
            </View>
            <View className="flex-1 pt-1">
              <Text variant="h2" className="text-[18px]" numberOfLines={1}>
                {profile.name}
              </Text>
              <View className="mt-1 flex-row flex-wrap items-center gap-1.5">
                <Badge
                  label={profile.role === 'referee' ? 'Juge arbitre' : profile.role === 'admin' ? 'Admin' : 'Joueur'}
                  tone="neutral"
                />
                {profile.profile?.position ? (
                  <Badge label={POSITION_LABELS[profile.profile.position] ?? profile.profile.position} tone="info" />
                ) : null}
              </View>
              {profile.club ? (
                <Text variant="caption" className="mt-1 font-heading text-brand-orange text-[11px]" numberOfLines={1}>
                  {profile.club.name}
                </Text>
              ) : null}
              {profile.city ? (
                <View className="mt-0.5 flex-row items-center gap-1">
                  <MapPin size={10} color="#94A3B8" />
                  <Text variant="caption" className="text-[10px]">{profile.city}</Text>
                </View>
              ) : null}
            </View>
          </View>
          {profile.profile?.bio ? (
            <Text variant="caption" className="mt-3 leading-5">
              {profile.profile.bio}
            </Text>
          ) : null}
        </View>

        {/* Stats — grille 4 colonnes (port d541157) */}
        <View className="mx-5 mt-4 flex-row gap-2">
          <StatCell value={profile.padel_points ?? 0} label="Points" sub="FFT" />
          <StatCell value={profile.ranking ?? '—'} label="Rang" />
          <StatCell value={profile.padel_level ?? '—'} label="Niveau" />
          <StatCell
            value={POSITION_LABELS[profile.profile?.position ?? ''] ?? '—'}
            label="Position"
          />
        </View>

        {/* Bio */}
        {profile.profile?.bio ? (
          <View className="mx-5 mt-4">
            <Card>
              <Text variant="h3" className="text-[15px]">À propos</Text>
              <Text variant="body" className="mt-2">
                {profile.profile.bio}
              </Text>
            </Card>
          </View>
        ) : null}

        {/* Niveaux préférés */}
        {profile.preferred_levels && profile.preferred_levels.length > 0 ? (
          <View className="mx-5 mt-4">
            <Card>
              <Text variant="h3" className="text-[15px]">Niveaux préférés</Text>
              <View className="mt-2 flex-row flex-wrap gap-2">
                {profile.preferred_levels.map((lvl) => (
                  <Badge key={lvl} label={lvl} tone="info" />
                ))}
              </View>
            </Card>
          </View>
        ) : null}

        {/* Disponibilités */}
        {profile.availabilities && profile.availabilities.length > 0 ? (
          <View className="mx-5 mt-4">
            <Card>
              <Text variant="h3" className="text-[15px]">Disponibilités</Text>
              <View className="mt-2 flex-row flex-wrap gap-2">
                {profile.availabilities.map((d) => (
                  <Badge key={d} label={DAY_LABELS[d] ?? String(d)} tone="neutral" />
                ))}
              </View>
            </Card>
          </View>
        ) : null}
      </ScrollView>

      {/* Modal édition simple (bio + ville) */}
      {editing ? (
        <Modal transparent animationType="slide" onRequestClose={() => setEditing(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1"
          >
            <Pressable onPress={() => setEditing(false)} className="flex-1 bg-black/40" />
            <View className="rounded-t-3xl bg-white px-6 pb-8 pt-5">
              <View className="mb-4 flex-row items-center justify-between">
                <Text variant="h2" className="text-[20px]">Modifier mon profil</Text>
                <Pressable onPress={() => setEditing(false)} hitSlop={8}>
                  <X size={22} color="#1A2A4A" />
                </Pressable>
              </View>

              <Input
                label="VILLE"
                placeholder="Ex : Agde"
                value={city}
                onChangeText={setCity}
                fieldBg="brand"
              />

              <Text variant="caption" className="mb-1.5 mt-4 font-body-medium text-brand-navy">
                À PROPOS
              </Text>
              <TextInput
                multiline
                value={bio}
                onChangeText={setBio}
                placeholder="Quelques mots sur toi..."
                placeholderTextColor="#94A3B8"
                className="min-h-[96px] rounded-2xl border border-brand-border bg-brand-bg p-4 font-body text-[15px] text-brand-navy"
                style={{ textAlignVertical: 'top' }}
              />

              <Button
                label={updateMut.isPending ? 'Enregistrement...' : 'Enregistrer'}
                loading={updateMut.isPending}
                onPress={handleSave}
                className="mt-4"
              />
            </View>
          </KeyboardAvoidingView>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

function StatCell({ value, label, sub }: { value: string | number; label: string; sub?: string }) {
  return (
    <View className="flex-1 items-center rounded-2xl border border-brand-border bg-white p-2.5">
      <Text variant="h3" className="text-[18px] text-brand-navy">{value}</Text>
      <Text variant="caption" className="text-[9px]">{label}</Text>
      {sub ? <Text variant="caption" className="text-[9px] text-brand-muted">{sub}</Text> : null}
    </View>
  );
}
