import { Search, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';

import { Text } from '@/design-system';
import { useUserSearch } from '@/features/friendly-matches/useFriendlyMatches';

interface SelectedUser {
  uuid: string;
  name: string;
  picture_url: string | null;
}

interface Props {
  visible: boolean;
  title: string;
  excludeUuids?: string[];
  onPick: (user: SelectedUser) => void;
  onClose: () => void;
}

/**
 * Modal de sélection utilisateur — utilisé pour partner + 2 opponents.
 * Recherche debounce 300ms via useUserSearch.
 */
export function UserPickerModal({ visible, title, excludeUuids = [], onPick, onClose }: Props) {
  const [raw, setRaw] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setQ(raw.trim()), 300);
    return () => clearTimeout(id);
  }, [raw]);

  const query = useUserSearch(q);
  const results = (query.data ?? []).filter((u) => !excludeUuids.includes(u.uuid));

  const handlePick = (u: { uuid: string; name: string; picture_url: string | null }) => {
    onPick({ uuid: u.uuid, name: u.name, picture_url: u.picture_url });
    setRaw('');
    setQ('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <Pressable onPress={onClose} className="flex-1 bg-black/40" />
        <View className="max-h-[75%] rounded-t-3xl bg-white px-5 pb-6 pt-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text variant="h2" className="text-[17px]">{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color="#1A2A4A" />
            </Pressable>
          </View>

          <View className="mb-3 flex-row items-center gap-2.5 rounded-2xl border border-brand-border bg-brand-bg px-3.5 py-2.5">
            <Search size={16} color="#94A3B8" />
            <TextInput
              value={raw}
              onChangeText={setRaw}
              placeholder="Nom ou prénom…"
              placeholderTextColor="#94A3B8"
              className="flex-1 font-body text-[14px] text-brand-navy"
              autoFocus
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {q.length < 2 ? (
              <Text variant="caption" className="py-6 text-center">
                Tape au moins 2 caractères pour chercher.
              </Text>
            ) : query.isLoading ? (
              <View className="py-6">
                <ActivityIndicator color="#E8650A" />
              </View>
            ) : results.length === 0 ? (
              <Text variant="caption" className="py-6 text-center">
                Aucun joueur trouvé.
              </Text>
            ) : (
              results.map((u) => (
                <Pressable
                  key={u.uuid}
                  onPress={() => handlePick(u)}
                  className="flex-row items-center gap-3 border-b border-brand-border/50 py-2.5"
                >
                  <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-brand-orange">
                    {u.picture_url ? (
                      <Image source={{ uri: u.picture_url }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                    ) : (
                      <Text className="font-heading-black text-white">
                        {(u.name || '?').charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text variant="body-medium" className="text-[13px]" numberOfLines={1}>
                      {u.name}
                    </Text>
                    {u.clubs && u.clubs.length > 0 ? (
                      <Text variant="caption" className="mt-0.5 text-[11px]" numberOfLines={1}>
                        {u.clubs[0].name} · {u.clubs[0].city}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
