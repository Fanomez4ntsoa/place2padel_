import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Check, ImageIcon, Trophy, X } from 'lucide-react-native';
import { useState } from 'react';
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

import { useAuth } from '@/contexts/AuthContext';
import { Card, Text } from '@/design-system';
import { useCreatePost } from '@/features/feed/useFeed';
import type { TournamentSummary } from '@/features/tournaments/types';
import {
  flattenMyTournaments,
  useMyTournaments,
} from '@/features/tournaments/useMyTournaments';
import { formatApiError } from '@/lib/api';
import { showToast } from '@/lib/toast';

interface Props {
  visible: boolean;
  onClose: () => void;
  /**
   * Si fourni, préremplit le salon tournoi (cas compositeur depuis la page
   * détail tournoi). Le sélecteur reste caché dans ce mode.
   */
  lockedTournament?: { uuid: string; name: string } | null;
}

const MAX_TEXT = 2000;

/**
 * Bottom-sheet de création de post. Port ProfilePage.js Emergent d5ac086
 * adapté mobile : textarea + bouton "Photo" → expo-image-picker, preview
 * carrée 4/5 + croix, sélecteur tournoi optionnel (mes tournois `upcoming`
 * + `in_progress`), bouton "Publier" orange.
 *
 * Le backend Laravel enforce la permission salon : si tournament_uuid est
 * fourni, l'user doit être organisateur, admin ou participant — 403 sinon
 * (géré par le toast d'erreur formatApiError).
 */
export function CreatePostSheet({ visible, onClose, lockedTournament = null }: Props) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [tournamentUuid, setTournamentUuid] = useState<string | null>(
    lockedTournament?.uuid ?? null,
  );
  const [tournamentPickerOpen, setTournamentPickerOpen] = useState(false);

  const createMut = useCreatePost();
  const upcoming = useMyTournaments('upcoming');
  const inProgress = useMyTournaments('in_progress');

  const myTournaments: TournamentSummary[] = [
    ...flattenMyTournaments(inProgress.data),
    ...flattenMyTournaments(upcoming.data),
  ];

  const selectedTournament =
    lockedTournament ??
    (tournamentUuid
      ? myTournaments.find((t) => t.uuid === tournamentUuid)
        ? {
            uuid: tournamentUuid,
            name: myTournaments.find((t) => t.uuid === tournamentUuid)!.name,
          }
        : null
      : null);

  const reset = () => {
    setText('');
    setAsset(null);
    setTournamentUuid(lockedTournament?.uuid ?? null);
    setTournamentPickerOpen(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Autorisation requise', "Active l'accès aux photos dans les réglages.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    setAsset(result.assets[0]);
  };

  const canSubmit =
    !createMut.isPending && (text.trim().length > 0 || !!asset);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      let imagePayload:
        | { uri: string; name: string; type: string }
        | null = null;
      if (asset) {
        const uriExt = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
        const mimeMap: Record<string, string> = {
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          png: 'image/png',
          webp: 'image/webp',
        };
        const type = asset.mimeType ?? mimeMap[uriExt] ?? 'image/jpeg';
        imagePayload = {
          uri: asset.uri,
          name: `post.${uriExt}`,
          type,
        };
      }

      await createMut.mutateAsync({
        text: text.trim() || undefined,
        image: imagePayload,
        tournament_uuid: tournamentUuid,
      });
      showToast('Post publié ✅', 'success');
      reset();
      onClose();
    } catch (err) {
      Alert.alert('Publication impossible', formatApiError(err));
    }
  };

  if (!user) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <Pressable onPress={handleClose} className="flex-1 bg-black/50" />
        <View className="max-h-[88%] rounded-t-3xl bg-white pb-6">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-brand-border/50 px-5 py-4">
            <Pressable onPress={handleClose} hitSlop={8}>
              <X size={22} color="#1A2A4A" />
            </Pressable>
            <Text variant="h2" className="text-[16px]">
              Nouveau post
            </Text>
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              hitSlop={8}
              style={{ opacity: canSubmit ? 1 : 0.4 }}
            >
              {createMut.isPending ? (
                <ActivityIndicator color="#E8650A" />
              ) : (
                <Text className="font-heading-black text-[14px] text-brand-orange">
                  Publier
                </Text>
              )}
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Textarea */}
            <View className="px-5 pt-4">
              <TextInput
                multiline
                value={text}
                onChangeText={(v) => {
                  if (v.length <= MAX_TEXT) setText(v);
                }}
                placeholder="Partage une actualité, un résultat, une photo..."
                placeholderTextColor="#94A3B8"
                className="min-h-[100px] rounded-2xl border border-brand-border bg-brand-bg p-4 font-body text-[15px] text-brand-navy"
                style={{ textAlignVertical: 'top' }}
              />
              <Text variant="caption" className="mt-1.5 text-right text-[10px]">
                {text.length}/{MAX_TEXT}
              </Text>
            </View>

            {/* Image preview */}
            {asset ? (
              <View className="mx-5 mt-2">
                <View className="relative overflow-hidden rounded-2xl border border-brand-border">
                  <Image
                    source={asset.uri}
                    style={{ width: '100%', aspectRatio: 4 / 5 }}
                    contentFit="cover"
                  />
                  <Pressable
                    onPress={() => setAsset(null)}
                    hitSlop={8}
                    className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-black/60"
                  >
                    <X size={16} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>
            ) : null}

            {/* Tournoi sélectionné (lecture seule si lockedTournament, effaçable sinon) */}
            {selectedTournament ? (
              <View className="mx-5 mt-3 flex-row items-center gap-2 rounded-2xl border border-brand-orange/30 bg-brand-orange-light px-3 py-2.5">
                <Trophy size={14} color="#E8650A" />
                <Text
                  variant="caption"
                  className="flex-1 text-[12px] font-heading text-brand-orange"
                  numberOfLines={1}
                >
                  Salon : {selectedTournament.name}
                </Text>
                {!lockedTournament ? (
                  <Pressable onPress={() => setTournamentUuid(null)} hitSlop={8}>
                    <X size={14} color="#E8650A" />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {/* Actions row */}
            <View className="mx-5 mt-4 flex-row items-center gap-2">
              <Pressable
                onPress={pickImage}
                className="flex-row items-center gap-2 rounded-full border border-brand-border bg-white px-3 py-2"
              >
                <ImageIcon size={14} color="#E8650A" />
                <Text variant="caption" className="text-[12px] font-heading">
                  Photo
                </Text>
              </Pressable>
              {!lockedTournament && !selectedTournament ? (
                <Pressable
                  onPress={() => setTournamentPickerOpen(true)}
                  className="flex-row items-center gap-2 rounded-full border border-brand-border bg-white px-3 py-2"
                >
                  <Trophy size={14} color="#E8650A" />
                  <Text variant="caption" className="text-[12px] font-heading">
                    Lier un tournoi
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </ScrollView>
        </View>

        {/* Tournament picker (si non-locked) */}
        {tournamentPickerOpen ? (
          <TournamentPicker
            tournaments={myTournaments}
            loading={inProgress.isLoading || upcoming.isLoading}
            selected={tournamentUuid}
            onPick={(uuid) => {
              setTournamentUuid(uuid);
              setTournamentPickerOpen(false);
            }}
            onClose={() => setTournamentPickerOpen(false)}
          />
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * Sous-modal liste des tournois du viewer — seules les options où le backend
 * autorisera le post sont pertinentes (captain/partner/organizer/admin).
 * On se base sur /tournaments/mine qui matche exactement ce critère.
 */
function TournamentPicker({
  tournaments,
  loading,
  selected,
  onPick,
  onClose,
}: {
  tournaments: TournamentSummary[];
  loading: boolean;
  selected: string | null;
  onPick: (uuid: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/50" />
      <View className="max-h-[70%] rounded-t-3xl bg-white pb-8 pt-4">
        <View className="mb-3 flex-row items-center justify-between px-5">
          <Text variant="h2" className="text-[16px]">
            Lier un tournoi
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <X size={22} color="#1A2A4A" />
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator color="#E8650A" className="my-6" />
          ) : tournaments.length === 0 ? (
            <View className="mx-5 mt-3">
              <Card>
                <Text variant="caption" className="py-3 text-center">
                  Aucun tournoi à afficher. Inscris-toi à un tournoi ou crées-en un
                  pour pouvoir publier dans son salon.
                </Text>
              </Card>
            </View>
          ) : (
            tournaments.map((t) => {
              const isSelected = t.uuid === selected;
              return (
                <Pressable
                  key={t.uuid}
                  onPress={() => onPick(t.uuid)}
                  className="flex-row items-center gap-3 border-b border-brand-border/40 px-5 py-3"
                >
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-orange-light">
                    <Trophy size={16} color="#E8650A" />
                  </View>
                  <View className="flex-1">
                    <Text variant="body-medium" className="text-[13px]" numberOfLines={1}>
                      {t.name}
                    </Text>
                    <Text variant="caption" className="mt-0.5 text-[11px]" numberOfLines={1}>
                      {t.club?.name ?? '—'} · {t.level} · {t.date}
                    </Text>
                  </View>
                  {isSelected ? <Check size={18} color="#E8650A" /> : null}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
